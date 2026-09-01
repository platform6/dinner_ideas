---
stage: test
bolt: 041-claude-proxy-hardening
created: '2026-09-01T00:20:00Z'
---

## Test Report: claude-proxy-hardening (bolt 041)

### Summary

- **Deno tests**: 33/33 passed (`deno test --allow-env`) — 25 from bolt 040, 5 new for
  `mapAnthropicError`, 3 new pipeline cases for metering isolation.
- **Type-check**: `deno check` clean on all 5 sources.
- **Lint / format**: `deno lint .` clean (8 files); `prettier --check` clean on all changed
  `.ts` and `.md`.
- **pgTAP**: unchanged from bolt 040 — this bolt adds no SQL. (`supabase test db` still
  `PASS`, 227.)

### Test Files

- [x] `supabase/functions/claude-proxy/anthropic.test.ts` _(new)_ — `mapAnthropicError` pure
      unit tests: the previously-unreachable `timeout` branch, plus `upstream_error` fallback
      and `ProxyFailure` pass-through.
- [x] `supabase/functions/claude-proxy/index.test.ts` — 3 new pipeline cases over stubbed
      `Deps` for the split 200 branch.

### New Deno cases

**`mapAnthropicError` (anthropic.test.ts)**

- `{ name: 'APIConnectionTimeoutError' }` → `ProxyFailure('timeout', 502)` (asserts instance +
  `code` + `httpStatus`).
- `{ message: 'the request timed out' }` / `{ message: 'socket timeout after 45000ms' }` with
  a non-timeout name → `timeout`.
- `{ name: 'APIUserAbortError' }` → `timeout`.
- `{ name: 'APIError', message: '500 …' }`, `new Error('socket hang up')`, `'weird string'`,
  `null`, `undefined` → `upstream_error` (502).
- a `ProxyFailure` argument is returned by reference (`assertStrictEquals`).

**Pipeline metering isolation (index.test.ts)**

- `insertUsage` rejects after a successful `callAnthropic` ⇒ `status === 200`, body
  `text: 'pong'` / `model`, `rows.length === 0`, `console.error` called exactly once (spied
  by swapping `console.error` and restoring in `finally`).
- `callAnthropic` throws a generic `Error('socket hang up')` (not a `ProxyFailure`) ⇒ `502
upstream_error` + one `ok=false` row — the split's fallback mapping.
- `callAnthropic` throws `ProxyFailure('timeout')` ⇒ `502 timeout` + one `ok=false,
error_code='timeout'` row — the path is now reachable end-to-end through `handleProxy`.

### Acceptance Criteria Validation (story 004)

- ✅ `anthropic.ts` constructs the client with `timeout: 45_000` and `maxRetries: 0`.
  _(code; `deno check` confirms both are valid `ClientOptions`)_
- ✅ Timeout-shaped SDK error → `ProxyFailure('timeout', 502)`; anything else →
  `upstream_error` (502). _(anthropic.test.ts — 5 cases)_
- ✅ `callAnthropic` throwing `timeout` ⇒ `502 timeout` + exactly one row.
  _(index.test.ts "ProxyFailure(\"timeout\") … path reachable"; plus the bolt-040 "timeout —
  502 timeout" test still green)_
- ✅ Success then `insertUsage` throws ⇒ still `200` with model text; `console.error` emitted;
  no `upstream_error`. _(index.test.ts "insertUsage throws after a successful call")_
- ✅ Success + `insertUsage` ok ⇒ `200` body byte-identical; exactly one `ok=true` row.
  _(bolt-040 "happy path — 200 + one ok=true row with cost" — unchanged, still green)_
- ✅ Genuine Anthropic 5xx / network error ⇒ `502 upstream_error` + one row — unchanged.
  _(index.test.ts "generic … callAnthropic throw"; bolt-040 "upstream_error — 502" still
  green)_
- ✅ All 25 pre-existing Deno tests pass; `deno check` / `deno lint` / `prettier` clean.
- ✅ README documents `ANTHROPIC_TIMEOUT_MS`, `maxRetries: 0`, the "retries stack on the
  timeout" rationale, and the "must stay under the Edge wall-clock limit" caveat.

**Invariant** — one `ai_usage_log` row per resolved-household request holds on success,
`timeout`, and `upstream_error`; the single documented exception (metering write fails after a
billed call → `200`, no row, logged) is asserted directly.

### Issues Found

None.

### Notes

- `mapAnthropicError` is tested; the SDK actually _honouring_ the `timeout` option is the
  SDK's contract, not re-tested here (would require a real network call or deep SDK stubbing).
  The `client.d.ts` type-check plus the SDK docs are the evidence that `timeout` / `maxRetries`
  are wired.
- No migration, so `supabase test db` output is unchanged from bolt 040.
- Deploy still pending (bolt 042 + OQ-5): `supabase functions deploy claude-proxy` +
  `supabase db push` for `20260831213000_ai_call_counter.sql`, then verify, before
  `009-recipe-import`.
