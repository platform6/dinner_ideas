---
stage: plan
bolt: 041-claude-proxy-hardening
created: '2026-08-31T23:52:00Z'
---

## Implementation Plan: claude-proxy-hardening (bolt 041)

### Objective

FR-4 — make the `timeout` outcome real, and stop a metering-write failure from turning a
paid, successful Claude call into a client-visible `502`. Story
`004-sdk-timeout-and-metering-isolation`. No contract change; the 200 happy-path body is
unchanged.

### Findings addressed

- **Finding 2** — `new Anthropic({ apiKey, maxRetries: 1 })` sets no `timeout`, so the SDK's
  ~10-minute default applies. The Edge Function is killed by the platform first, so
  `ProxyFailure('timeout')` (`anthropic.ts`) is effectively unreachable and **no**
  `ai_usage_log` row is written. The SDK also **retries timeouts by default** (its own docs:
  _"request timeouts are retried by default, so … you may wait much longer than this
  timeout"_), compounding the wall-clock spend.
- **Finding 4** — in the 200 branch, `await write(...)` runs inside the `try` whose `catch`
  maps any throw to `ProxyFailure('upstream_error', 502)`. An `insertUsage` failure _after_ a
  billed call ⇒ `logged` is already `true`, the catch's `write` no-ops ⇒ caller gets `502`,
  no row, a retry pays for a second call.

### Deliverables

1. **`supabase/functions/claude-proxy/anthropic.ts`**
   - `new Anthropic({ apiKey, timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: 0 })` where
     `ANTHROPIC_TIMEOUT_MS = 45_000` — a module constant, comfortably under the Supabase
     Edge Function wall-clock limit (documented ~150 s; see OQ-5 / deploy note), and
     `maxRetries: 0` so worst-case wall clock ≈ 1 × timeout (OQ-3).
   - Extract the SDK-error → `ProxyFailure` mapping into a small pure exported function
     `mapAnthropicError(err): ProxyFailure` so the timeout-detection branch — the one that
     was unreachable — is directly unit-testable. The `try/catch` in `callAnthropic` calls
     it. No behaviour change to the mapping itself (timeout-shaped name/message → `timeout`;
     everything else → `upstream_error`).
   - Handle `APIUserAbortError` name as timeout-shaped too (defensive — an abort backstop
     could be added later; the SDK `timeout` option is the mechanism for v1).
2. **`supabase/functions/claude-proxy/pipeline.ts`** — split the 200 branch so the
   success-path metering write is isolated:
   - `callAnthropic` in its own `try` → on throw, map via `ProxyFailure` passthrough exactly
     as today (`timeout` / `upstream_error`), `write` the failure row, return the mapped
     status. (Unchanged behaviour.)
   - On success: compute `est_cost_usd`, then `write(...)` the `ok:true` row inside its **own**
     `try/catch` that `console.error`s and swallows. Return `200` with
     `{ text, model, usage, latency_ms }` regardless of whether the metering write succeeded.
   - The outer validation `try/catch` and every other path are untouched.
3. **`supabase/functions/claude-proxy/anthropic.test.ts`** _(new)_ — unit tests for
   `mapAnthropicError`.
4. **`supabase/functions/claude-proxy/index.test.ts`** — new pipeline cases for
   metering-failure isolation (see Test plan).
5. **`supabase/functions/claude-proxy/README.md`** — record `ANTHROPIC_TIMEOUT_MS` (45 s),
   `maxRetries: 0`, the "retries are on top of the timeout" rationale, and that the value
   must stay under the project's Edge Function wall-clock limit.

### Not in scope

- An `AbortController` backstop around `messages.create` — the SDK `timeout` option is
  sufficient; a second mechanism is complexity without benefit at this scale. Noted as
  considered.
- The client-side `callClaude` timeout (`src/features/ai/api.ts`) — that is FR-5, bolt `042`.
- Any change to `estCostUsd`, the rate table, streaming, or retry/backoff beyond
  `maxRetries: 0`.
- Guaranteeing a row in the metering-write-failure case — explicitly accepted as
  logged-only (story 004 AC).

### Technical approach

- `pipeline.ts` stays I/O-free; `deps.callAnthropic` and `deps.insertUsage` are still the
  only I/O, both injected, so the new branches are covered with stubs.
- Invariant "exactly one `ai_usage_log` row per resolved-household request" holds on: success
  (row written), `timeout` (row written — now reachable), `upstream_error` (row written). The
  **one documented exception**: `insertUsage` throws on the success path → 200 returned, no
  row, `console.error` logged. Never two rows, never a wrong-status response.
- `mapAnthropicError` keeps the exact regex checks currently in `anthropic.ts`
  (`/timeout/i.test(name)`, `/timed?\s*out/i.test(msg)`), just relocated and exported.

### Dependencies

- **Bolt `040`** (complete) — this edits the same `pipeline.ts` 200/catch block that `040`
  reworked; building on `040`'s current file.
- **`@anthropic-ai/sdk@0.122.0`** — `timeout` (ms) and `maxRetries` are stable client
  options (confirmed in `client.d.ts`). No version bump.
- **Supabase Edge runtime wall-clock limit** — 45 s assumes ≥ ~120 s available. Re-confirm
  against the project's plan at deploy (documented in README); if materially lower, drop
  `ANTHROPIC_TIMEOUT_MS` to ≈ ⅓ of it.

### Acceptance Criteria

- [ ] `anthropic.ts` constructs the client with an explicit `timeout` (45 s) and
      `maxRetries: 0`.
- [ ] A timeout-shaped SDK error (`APIConnectionTimeoutError`, or a message matching
      `timed out`) maps to `ProxyFailure('timeout', …, 502)`; any other error maps to
      `ProxyFailure('upstream_error', …, 502)`. _(unit: `mapAnthropicError`)_
- [ ] Pipeline: `callAnthropic` throws `ProxyFailure('timeout')` ⇒ `502 { error_code:
    'timeout' }` + exactly one `ai_usage_log` row (`ok=false`, `error_code='timeout'`).
      _(already asserted by the reshaped `007` "timeout" test — keep it green)_
- [ ] Pipeline: `callAnthropic` succeeds, then `insertUsage` throws ⇒ caller still gets
      `200` with the model `text` / `usage` / `latency_ms`; a `console.error` is emitted; no
      `upstream_error`.
- [ ] Pipeline: `callAnthropic` succeeds and `insertUsage` succeeds ⇒ `200` body
      byte-for-byte identical to today; exactly one `ok=true` row.
- [ ] Pipeline: genuine Anthropic 5xx / network error (`ProxyFailure('upstream_error')` or a
      generic throw) ⇒ `502 upstream_error` + one row — unchanged.
- [ ] All 25 existing Deno tests pass; `deno check` / `deno lint` / `prettier --check` clean.
- [ ] README documents the timeout value and rationale.

### Test plan (Stage 3 preview)

**`anthropic.test.ts` (new)** — `mapAnthropicError`:

- `{ name: 'APIConnectionTimeoutError' }` → `ProxyFailure('timeout', …, 502)`.
- `{ message: 'Request timed out.' }` → `timeout`.
- `{ name: 'APIError', message: '500 server error' }` → `upstream_error`.
- a plain `Error('socket hang up')` → `upstream_error`.
- a `ProxyFailure` passed through is returned as-is (if `callAnthropic` ever nests one).

**`index.test.ts` (new pipeline cases)**:

- success + `insertUsage` throws → `status === 200`, body has `text: 'pong'`,
  `rows.length === 0`, and a `console.error` spy fired once.
- success + `insertUsage` ok → `status === 200`, `rows.length === 1`, `rows[0].ok === true`
  (guards against a regression where isolation drops the row on the happy path).
- failure (`callAnthropic` throws generic `Error`) + `insertUsage` ok → `502 upstream_error`,
  one `ok=false` row (failure-path metering unaffected by the split).

### Open items for the checkpoint

1. `ANTHROPIC_TIMEOUT_MS = 45_000` — OK, or prefer a different value / make it an env var?
   (Recommending a hard-coded constant for v1; env-var-ifying it is easy later.)
2. Extracting `mapAnthropicError` as an exported pure function purely for testability — OK?
   (Recommending yes — it's the previously-dead timeout branch.)
