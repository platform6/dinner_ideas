import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { callClaude, ClaudeError } from '@/features/ai/api';
import { supabase } from '@/shared/lib/supabase';

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

const mockedGetSession = vi.mocked(supabase.auth.getSession);

function withSession() {
  mockedGetSession.mockResolvedValue({
    data: { session: { access_token: 'tok-123' } },
  } as never);
}

function mockFetch(status: number, body: unknown, opts: { reject?: boolean } = {}) {
  const fn = vi.fn();
  if (opts.reject) {
    fn.mockRejectedValue(new TypeError('network down'));
  } else {
    fn.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('callClaude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws no_session before any request when there is no session', async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null } } as never);
    const fetchFn = mockFetch(200, {});
    await expect(
      callClaude({ feature: 'connection_test', messages: [{ role: 'user', content: 'ping' }] }),
    ).rejects.toMatchObject({ code: 'no_session' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns the mapped success shape and sends a Bearer token', async () => {
    withSession();
    const fetchFn = mockFetch(200, {
      text: 'pong',
      model: 'claude-sonnet-5',
      usage: { input_tokens: 10, output_tokens: 2 },
      latency_ms: 421,
    });
    const r = await callClaude({
      feature: 'connection_test',
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 16,
    });
    expect(r).toEqual({
      text: 'pong',
      model: 'claude-sonnet-5',
      usage: { inputTokens: 10, outputTokens: 2 },
      latencyMs: 421,
    });
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer tok-123',
    });
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      feature: 'connection_test',
      max_tokens: 16,
    });
  });

  it.each([
    ['no_household', 403],
    ['no_api_key', 409],
    ['rate_limited', 429],
    ['bad_request', 400],
    ['upstream_error', 502],
    ['timeout', 502],
  ] as const)('maps error_code %s (HTTP %i) to ClaudeError.code', async (code, status) => {
    withSession();
    mockFetch(status, { error_code: code, message: 'nope' });
    await expect(
      callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code });
  });

  it('maps HTTP 401 to no_session', async () => {
    withSession();
    mockFetch(401, { error_code: 'unauthenticated' });
    await expect(
      callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: 'no_session' });
  });

  it('maps an unknown error_code to upstream_error', async () => {
    withSession();
    mockFetch(500, { error_code: 'weird', message: 'x' });
    await expect(
      callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });

  it('maps a network failure to upstream_error', async () => {
    withSession();
    mockFetch(0, null, { reject: true });
    await expect(
      callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: 'upstream_error' });
  });

  it('maps an aborted fetch (client timeout) to ClaudeError timeout', async () => {
    withSession();
    const abort = new Error('The operation was aborted.');
    abort.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(
      callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('passes an AbortSignal to fetch', async () => {
    withSession();
    const fetchFn = mockFetch(200, {
      text: 'pong',
      model: 'claude-sonnet-5',
      usage: { input_tokens: 1, output_tokens: 1 },
      latency_ms: 1,
    });
    await callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] });
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects a 200 with a malformed body', async () => {
    withSession();
    mockFetch(200, { model: 'claude-sonnet-5' }); // no `text`
    await expect(
      callClaude({ feature: 'x', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toBeInstanceOf(ClaudeError);
  });
});
