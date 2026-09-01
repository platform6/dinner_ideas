// Unit tests for the SDK-error → ProxyFailure mapping. (intent 008, bolt 041, story 004)
// Run:  deno test --allow-env supabase/functions/claude-proxy/
//
// mapAnthropicError is pure — this covers the `timeout` branch that was effectively
// unreachable in production before an explicit SDK timeout was set.

import { assertEquals, assertInstanceOf, assertStrictEquals } from 'std/assert';
import { mapAnthropicError } from './anthropic.ts';
import { ProxyFailure } from './errors.ts';

Deno.test('mapAnthropicError — APIConnectionTimeoutError name → timeout (502)', () => {
  const pf = mapAnthropicError({ name: 'APIConnectionTimeoutError', message: 'Request timed out.' });
  assertInstanceOf(pf, ProxyFailure);
  assertEquals(pf.code, 'timeout');
  assertEquals(pf.httpStatus, 502);
});

Deno.test('mapAnthropicError — "timed out" message with a non-timeout name → timeout', () => {
  assertEquals(mapAnthropicError({ name: 'Error', message: 'the request timed out' }).code, 'timeout');
  assertEquals(mapAnthropicError({ message: 'socket timeout after 45000ms' }).code, 'timeout');
});

Deno.test('mapAnthropicError — APIUserAbortError → timeout', () => {
  assertEquals(
    mapAnthropicError({ name: 'APIUserAbortError', message: 'Request was aborted.' }).code,
    'timeout',
  );
});

Deno.test('mapAnthropicError — anything else → upstream_error (502)', () => {
  assertEquals(
    mapAnthropicError({ name: 'APIError', message: '500 Internal Server Error' }).code,
    'upstream_error',
  );
  assertEquals(mapAnthropicError(new Error('socket hang up')).code, 'upstream_error');
  assertEquals(mapAnthropicError('weird string').code, 'upstream_error');
  assertEquals(mapAnthropicError(null).code, 'upstream_error');
  assertEquals(mapAnthropicError(undefined).httpStatus, 502);
});

Deno.test('mapAnthropicError — a ProxyFailure is passed through unchanged', () => {
  const original = new ProxyFailure('bad_request', 'nope', 400);
  assertStrictEquals(mapAnthropicError(original), original);
});
