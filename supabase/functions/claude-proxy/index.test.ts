// Deno tests for the claude-proxy pipeline. (intent 007, bolt 038, story 003)
// Run:  deno test --allow-env supabase/functions/claude-proxy/
//
// `handleProxy` is pure over its `Deps`, so every branch is covered without network or a DB.

import { assertEquals } from 'std/assert';
import { handleProxy, type Deps, type UsageRow } from './pipeline.ts';
import { ProxyFailure } from './errors.ts';
import { estCostUsd } from './rates.ts';

function makeDeps(over: Partial<Deps> = {}): { deps: Deps; rows: UsageRow[] } {
  const rows: UsageRow[] = [];
  let clock = 1000;
  const deps: Deps = {
    getUser: () => Promise.resolve({ id: 'profile-1' }),
    resolveHousehold: () => Promise.resolve('hh-1'),
    loadConfig: () => Promise.resolve({ model_override: null, daily_call_limit: 25 }),
    countToday: () => Promise.resolve(0),
    resolveKey: () => Promise.resolve('sk-ant-key'),
    callAnthropic: () =>
      Promise.resolve({
        text: 'pong',
        usage: { input_tokens: 12, output_tokens: 3 },
      }),
    insertUsage: (row) => {
      rows.push(row);
      return Promise.resolve();
    },
    now: () => (clock += 5),
    envModel: undefined,
    envDailyLimit: undefined,
    ...over,
  };
  return { deps, rows };
}

const REQ = JSON.stringify({
  feature: 'connection_test',
  messages: [{ role: 'user', content: 'ping' }],
  max_tokens: 16,
});

Deno.test('401 when no Authorization header — no usage row', async () => {
  const { deps, rows } = makeDeps({ getUser: () => Promise.resolve(null) });
  const r = await handleProxy(REQ, null, deps);
  assertEquals(r.status, 401);
  assertEquals(rows.length, 0);
});

Deno.test('401 when getUser returns null', async () => {
  const { deps, rows } = makeDeps({ getUser: () => Promise.resolve(null) });
  const r = await handleProxy(REQ, 'Bearer bad', deps);
  assertEquals(r.status, 401);
  assertEquals(rows.length, 0);
});

Deno.test('403 no_household — no usage row', async () => {
  const { deps, rows } = makeDeps({ resolveHousehold: () => Promise.resolve(null) });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 403);
  assertEquals((r.body as { error_code: string }).error_code, 'no_household');
  assertEquals(rows.length, 0);
});

Deno.test('happy path — 200 + one ok=true row with cost', async () => {
  const { deps, rows } = makeDeps();
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 200);
  const body = r.body as { text: string; model: string; usage: unknown; latency_ms: number };
  assertEquals(body.text, 'pong');
  assertEquals(body.model, 'claude-sonnet-5');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].ok, true);
  assertEquals(rows[0].error_code, null);
  assertEquals(rows[0].input_tokens, 12);
  assertEquals(rows[0].output_tokens, 3);
  assertEquals(rows[0].est_cost_usd, estCostUsd('claude-sonnet-5', { input_tokens: 12, output_tokens: 3 }));
});

Deno.test('rate_limited — 429, one ok=false row, Anthropic not called', async () => {
  let called = false;
  const { deps, rows } = makeDeps({
    countToday: () => Promise.resolve(25),
    callAnthropic: () => {
      called = true;
      return Promise.resolve({ text: '', usage: { input_tokens: 0, output_tokens: 0 } });
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 429);
  assertEquals((r.body as { error_code: string }).error_code, 'rate_limited');
  assertEquals(called, false);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].ok, false);
  assertEquals(rows[0].error_code, 'rate_limited');
});

Deno.test('no_api_key — 409, one ok=false row', async () => {
  const { deps, rows } = makeDeps({ resolveKey: () => Promise.resolve(null) });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 409);
  assertEquals((r.body as { error_code: string }).error_code, 'no_api_key');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].error_code, 'no_api_key');
});

Deno.test('bad_request — non-allowlisted model', async () => {
  const { deps, rows } = makeDeps();
  const body = JSON.stringify({
    feature: 'x',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'hi' }],
  });
  const r = await handleProxy(body, 'Bearer ok', deps);
  assertEquals(r.status, 400);
  assertEquals((r.body as { error_code: string }).error_code, 'bad_request');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].ok, false);
});

Deno.test('bad_request — max_tokens over ceiling / empty messages / blank feature / oversized', async () => {
  const cases = [
    { feature: 'x', max_tokens: 99999, messages: [{ role: 'user', content: 'hi' }] },
    { feature: 'x', messages: [] },
    { feature: '', messages: [{ role: 'user', content: 'hi' }] },
    { feature: 'x', messages: [{ role: 'user', content: 'z'.repeat(60000) }] },
  ];
  for (const c of cases) {
    const { deps } = makeDeps();
    const r = await handleProxy(JSON.stringify(c), 'Bearer ok', deps);
    assertEquals(r.status, 400, JSON.stringify(c).slice(0, 40));
  }
});

Deno.test("bad_request — unparseable JSON, feature logged as 'unknown'", async () => {
  const { deps, rows } = makeDeps();
  const r = await handleProxy('{not json', 'Bearer ok', deps);
  assertEquals(r.status, 400);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].feature, 'unknown');
});

Deno.test('upstream_error — 502, one ok=false row', async () => {
  const { deps, rows } = makeDeps({
    callAnthropic: () => {
      throw new ProxyFailure('upstream_error', 'boom', 502);
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(rows[0].error_code, 'upstream_error');
});

Deno.test('timeout — 502 timeout', async () => {
  const { deps } = makeDeps({
    callAnthropic: () => {
      throw new ProxyFailure('timeout', 'slow', 502);
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'timeout');
});

Deno.test('model resolution: request > config override > env > fallback', async () => {
  // request wins
  let d = makeDeps({
    loadConfig: () => Promise.resolve({ model_override: 'claude-opus-5', daily_call_limit: 25 }),
    envModel: 'claude-haiku-4-5',
  });
  let r = await handleProxy(
    JSON.stringify({
      feature: 'x',
      model: 'claude-sonnet-5',
      messages: [{ role: 'user', content: 'hi' }],
    }),
    'Bearer ok',
    d.deps,
  );
  assertEquals((r.body as { model: string }).model, 'claude-sonnet-5');

  // config override wins when request omits model
  d = makeDeps({
    loadConfig: () => Promise.resolve({ model_override: 'claude-opus-5', daily_call_limit: 25 }),
    envModel: 'claude-haiku-4-5',
  });
  r = await handleProxy(
    JSON.stringify({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    'Bearer ok',
    d.deps,
  );
  assertEquals((r.body as { model: string }).model, 'claude-opus-5');

  // env wins when no request model and no override
  d = makeDeps({ envModel: 'claude-haiku-4-5' });
  r = await handleProxy(
    JSON.stringify({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    'Bearer ok',
    d.deps,
  );
  assertEquals((r.body as { model: string }).model, 'claude-haiku-4-5');
});

Deno.test('estCostUsd for each model', () => {
  const u = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
  assertEquals(estCostUsd('claude-sonnet-5', u), 12);
  assertEquals(estCostUsd('claude-haiku-4-5', u), 6);
  assertEquals(estCostUsd('claude-opus-5', u), 30);
  assertEquals(estCostUsd('unknown', u), 0);
});
