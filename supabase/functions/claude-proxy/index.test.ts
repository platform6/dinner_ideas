// Deno tests for the claude-proxy pipeline. (intent 007, bolt 038, story 003)
// Run:  deno test --allow-env supabase/functions/claude-proxy/
//
// `handleProxy` is pure over its `Deps`, so every branch is covered without network or a DB.

import { assertEquals } from 'std/assert';
import {
  handleProxy,
  type ConfigRow,
  type Deps,
  type Loaded,
  type Reservation,
  type UsageRow,
} from './pipeline.ts';
import { ProxyFailure } from './errors.ts';
import { estCostUsd, parsePositiveInt } from './rates.ts';

/** A successful dependency lookup. */
const loaded = <T>(data: T): Loaded<T> => ({ data, error: false });
/** A failed dependency lookup (query errored). */
const loadErr = <T>(): Loaded<T> => ({ data: null, error: true });

function makeDeps(over: Partial<Deps> = {}): { deps: Deps; rows: UsageRow[] } {
  const rows: UsageRow[] = [];
  let clock = 1000;
  const deps: Deps = {
    getUser: () => Promise.resolve({ id: 'profile-1' }),
    resolveHousehold: () => Promise.resolve(loaded<string | null>('hh-1')),
    loadConfig: () =>
      Promise.resolve(loaded<ConfigRow | null>({ model_override: null, daily_call_limit: 25 })),
    reserveCall: () => Promise.resolve<Reservation>({ ok: true, n: 1 }),
    resolveKey: () => Promise.resolve(loaded<string | null>('sk-ant-key')),
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
  const { deps, rows } = makeDeps({
    resolveHousehold: () => Promise.resolve(loaded<string | null>(null)),
  });
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
    reserveCall: () => Promise.resolve<Reservation>({ ok: false, reason: 'over_limit' }),
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
  const { deps, rows } = makeDeps({ resolveKey: () => Promise.resolve(loaded<string | null>(null)) });
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
    loadConfig: () =>
      Promise.resolve(loaded<ConfigRow | null>({ model_override: 'claude-opus-5', daily_call_limit: 25 })),
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
    loadConfig: () =>
      Promise.resolve(loaded<ConfigRow | null>({ model_override: 'claude-opus-5', daily_call_limit: 25 })),
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

// ─────────────────────────────────────────────────────────────────────────────
// intent 008 / bolt 040 — fail-closed daily cap, atomic reserve, surfaced
// resolver errors. (stories 001, 002, 003)
// ─────────────────────────────────────────────────────────────────────────────

Deno.test('parsePositiveInt — non-numeric / zero / negative / fractional → undefined', () => {
  for (const bad of ['25/day', 'abc', '', '0', '-1', '3.5', ' ', 'NaN']) {
    assertEquals(parsePositiveInt(bad), undefined, `"${bad}"`);
  }
  assertEquals(parsePositiveInt('10'), 10);
  assertEquals(parsePositiveInt('1'), 1);
  assertEquals(parsePositiveInt(undefined), undefined);
  assertEquals(parsePositiveInt(null), undefined);
});

Deno.test('FR-1: reserveCall error → 502 upstream_error, one row, Anthropic not called', async () => {
  let called = false;
  const { deps, rows } = makeDeps({
    reserveCall: () => Promise.resolve<Reservation>({ ok: false, reason: 'error' }),
    callAnthropic: () => {
      called = true;
      return Promise.resolve({ text: '', usage: { input_tokens: 0, output_tokens: 0 } });
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(called, false);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].ok, false);
  assertEquals(rows[0].error_code, 'upstream_error');
});

Deno.test('FR-1: non-finite effective daily_call_limit → 502 upstream_error, one row', async () => {
  let reserved = false;
  const { deps, rows } = makeDeps({
    loadConfig: () =>
      Promise.resolve(loaded<ConfigRow | null>({ model_override: null, daily_call_limit: NaN })),
    reserveCall: () => {
      reserved = true;
      return Promise.resolve<Reservation>({ ok: true, n: 1 });
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(reserved, false);
  assertEquals(rows.length, 1);
});

Deno.test(
  'FR-1: config-less household uses DEFAULT_DAILY_LIMIT (25) when envDailyLimit is undefined',
  async () => {
    let seenLimit = -1;
    const { deps } = makeDeps({
      loadConfig: () => Promise.resolve(loaded<ConfigRow | null>(null)),
      envDailyLimit: undefined,
      reserveCall: (_hh, limit) => {
        seenLimit = limit;
        return Promise.resolve<Reservation>({ ok: true, n: 1 });
      },
    });
    await handleProxy(REQ, 'Bearer ok', deps);
    assertEquals(seenLimit, 25);
  },
);

Deno.test('FR-1: config-less household uses envDailyLimit when set', async () => {
  let seenLimit = -1;
  const { deps } = makeDeps({
    loadConfig: () => Promise.resolve(loaded<ConfigRow | null>(null)),
    envDailyLimit: 10,
    reserveCall: (_hh, limit) => {
      seenLimit = limit;
      return Promise.resolve<Reservation>({ ok: true, n: 1 });
    },
  });
  await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(seenLimit, 10);
});

Deno.test('FR-3: resolveHousehold error → 502 upstream_error, NO usage row', async () => {
  const { deps, rows } = makeDeps({ resolveHousehold: () => Promise.resolve(loadErr<string | null>()) });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(rows.length, 0);
});

Deno.test('FR-3: resolveHousehold genuine null → 403 no_household (unchanged)', async () => {
  const { deps, rows } = makeDeps({
    resolveHousehold: () => Promise.resolve(loaded<string | null>(null)),
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 403);
  assertEquals((r.body as { error_code: string }).error_code, 'no_household');
  assertEquals(rows.length, 0);
});

Deno.test('FR-3: loadConfig error → 502 upstream_error, one row, no silent defaults', async () => {
  let reserved = false;
  const { deps, rows } = makeDeps({
    loadConfig: () => Promise.resolve(loadErr<ConfigRow | null>()),
    reserveCall: () => {
      reserved = true;
      return Promise.resolve<Reservation>({ ok: true, n: 1 });
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(reserved, false);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].error_code, 'upstream_error');
});

Deno.test('FR-3: resolveKey error → 502 upstream_error (distinct from data:null → 409)', async () => {
  const err = makeDeps({ resolveKey: () => Promise.resolve(loadErr<string | null>()) });
  const re = await handleProxy(REQ, 'Bearer ok', err.deps);
  assertEquals(re.status, 502);
  assertEquals((re.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(err.rows.length, 1);
  assertEquals(err.rows[0].error_code, 'upstream_error');

  const none = makeDeps({ resolveKey: () => Promise.resolve(loaded<string | null>(null)) });
  const rn = await handleProxy(REQ, 'Bearer ok', none.deps);
  assertEquals(rn.status, 409);
  assertEquals((rn.body as { error_code: string }).error_code, 'no_api_key');
});

Deno.test('FR-2: bad_request never calls reserveCall (cap not consumed by invalid input)', async () => {
  let reserved = false;
  const { deps, rows } = makeDeps({
    reserveCall: () => {
      reserved = true;
      return Promise.resolve<Reservation>({ ok: true, n: 1 });
    },
  });
  const r = await handleProxy(
    JSON.stringify({ feature: 'x', model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] }),
    'Bearer ok',
    deps,
  );
  assertEquals(r.status, 400);
  assertEquals(reserved, false);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].error_code, 'bad_request');
});

Deno.test('FR-2: happy path reserves exactly one slot before calling Anthropic', async () => {
  let reserveCalls = 0;
  let reservedBeforeCall = false;
  const { deps } = makeDeps({
    reserveCall: () => {
      reserveCalls += 1;
      return Promise.resolve<Reservation>({ ok: true, n: reserveCalls });
    },
    callAnthropic: () => {
      reservedBeforeCall = reserveCalls === 1;
      return Promise.resolve({ text: 'pong', usage: { input_tokens: 1, output_tokens: 1 } });
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 200);
  assertEquals(reserveCalls, 1);
  assertEquals(reservedBeforeCall, true);
});

Deno.test('ordering: no_api_key preempts rate_limit — reserveCall not reached', async () => {
  let reserved = false;
  const { deps, rows } = makeDeps({
    resolveKey: () => Promise.resolve(loaded<string | null>(null)),
    reserveCall: () => {
      reserved = true;
      return Promise.resolve<Reservation>({ ok: false, reason: 'over_limit' });
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 409);
  assertEquals((r.body as { error_code: string }).error_code, 'no_api_key');
  assertEquals(reserved, false);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].error_code, 'no_api_key');
});

// ─────────────────────────────────────────────────────────────────────────────
// intent 008 / bolt 041 — a metering-write failure must not corrupt a billed 200.
// (story 004-sdk-timeout-and-metering-isolation)
// ─────────────────────────────────────────────────────────────────────────────

Deno.test('FR-4: insertUsage throws after a successful call → still 200, logged, no row', async () => {
  const origErr = console.error;
  let logged = 0;
  console.error = () => {
    logged += 1;
  };
  try {
    const { deps, rows } = makeDeps({
      insertUsage: () => Promise.reject(new Error('PostgREST 503')),
    });
    const r = await handleProxy(REQ, 'Bearer ok', deps);
    assertEquals(r.status, 200);
    const body = r.body as { text: string; model: string };
    assertEquals(body.text, 'pong');
    assertEquals(body.model, 'claude-sonnet-5');
    assertEquals(rows.length, 0);
    assertEquals(logged, 1);
  } finally {
    console.error = origErr;
  }
});

Deno.test('FR-4: generic (non-ProxyFailure) callAnthropic throw → 502 upstream_error, one row', async () => {
  const { deps, rows } = makeDeps({
    callAnthropic: () => {
      throw new Error('socket hang up');
    },
  });
  const r = await handleProxy(REQ, 'Bearer ok', deps);
  assertEquals(r.status, 502);
  assertEquals((r.body as { error_code: string }).error_code, 'upstream_error');
  assertEquals(rows.length, 1);
  assertEquals(rows[0].ok, false);
  assertEquals(rows[0].error_code, 'upstream_error');
});

Deno.test(
  'FR-4: ProxyFailure("timeout") from callAnthropic → 502 timeout + one row (path reachable)',
  async () => {
    const { deps, rows } = makeDeps({
      callAnthropic: () => {
        throw new ProxyFailure('timeout', 'Claude request timed out', 502);
      },
    });
    const r = await handleProxy(REQ, 'Bearer ok', deps);
    assertEquals(r.status, 502);
    assertEquals((r.body as { error_code: string }).error_code, 'timeout');
    assertEquals(rows.length, 1);
    assertEquals(rows[0].ok, false);
    assertEquals(rows[0].error_code, 'timeout');
  },
);
