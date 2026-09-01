---
id: 004-sdk-timeout-and-metering-isolation
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
status: complete
priority: must
created: '2026-08-31T21:00:00Z'
assigned_bolt: 041-claude-proxy-hardening
implemented: true
---

# Story: 004-sdk-timeout-and-metering-isolation

## User Story

**As** a household member and the account that gets billed
**I want** a slow Claude call to end cleanly, and a successful call to always come back as success
**So that** every call is logged exactly once and I'm never charged for a call that was reported to me as a 502

## Context

- **No SDK timeout.** `new Anthropic({ apiKey, maxRetries: 1 })` (`anthropic.ts:26`) sets no
  `timeout`, so the SDK's ~10-minute default applies. The Edge Function's platform wall-clock
  budget is far shorter, so a slow Claude call gets the function killed before
  `callAnthropic` can throw — the `ProxyFailure('timeout')` branch (`anthropic.ts:49`) is
  effectively unreachable and **no** `ai_usage_log` row is written. `maxRetries: 1` doubles
  the worst-case wall clock. (Review finding 2.)
- **Metering failure corrupts a success.** In the 200 branch, `await write(...)`
  (`pipeline.ts:227`) is inside the `try` whose `catch` (line 245) maps _any_ throw to
  `ProxyFailure('upstream_error', 502)`. If `insertUsage` rejects after a successful, billed
  call, `logged` is already `true` so the catch's `write` no-ops — caller gets `502
upstream_error`, no row, and a retry pays for a second call. (Review finding 4.)

## Acceptance Criteria

- [ ] **Given** the Edge Function's measured wall-clock limit, **When** the `Anthropic` client
      is constructed, **Then** it passes an explicit `timeout` of roughly ⅓ of that limit and
      `maxRetries: 0` (OQ-3).
- [ ] **Given** `callAnthropic` where the underlying call exceeds the configured `timeout`,
      **When** `handleProxy` runs, **Then** it returns `502 { error_code: 'timeout' }` and
      writes exactly one `ai_usage_log` row (`ok=false, error_code='timeout', latency_ms`
      recorded) — the function returns before the platform kills it.
- [ ] **Given** a successful `callAnthropic`, **When** the subsequent `ai_usage_log` write
      throws, **Then** the caller still receives `200 { text, model, usage, latency_ms }` with
      the real model text; the throw is caught and `console.error`-logged, not surfaced.
- [ ] **Given** a successful call whose metering write also succeeds, **When** `handleProxy`
      runs, **Then** behaviour and the `200` body are byte-for-byte unchanged from today.
- [ ] **Given** a genuine Anthropic 5xx / network error, **When** `handleProxy` runs, **Then**
      it still returns `502 upstream_error` + one row exactly as today (this story does not
      change the failure mapping, only where the success-path write sits).
- [ ] **Given** the "exactly one `ai_usage_log` row per resolved-household request" invariant,
      **When** any of {success, success+metering-failure, timeout} occurs, **Then** it holds
      (one row on success/timeout; the metering-failure case is the documented exception where
      the row is missing but the function logs it — never two rows, never a wrong-status
      response).

## Technical Notes

- `anthropic.ts`: `new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 })`. Keep the
  existing `catch` that maps timeout-shaped errors to `ProxyFailure('timeout')` — it becomes
  reachable now. Consider also passing `{ signal }` from an `AbortController` armed just under
  the platform limit as a belt-and-braces backstop.
- `pipeline.ts` 200 branch: compute `est_cost_usd`, build the response, then do the metering
  write in its **own** `try/catch` that logs and swallows — outside the `try` whose `catch`
  produces `upstream_error`. The failure/`ProxyFailure` path keeps its current structure.
- Task one of the bolt: confirm the actual Supabase Edge runtime wall-clock limit; record the
  chosen `TIMEOUT_MS` in the function `README.md`.

## Dependencies

### Requires

- `001` / `002` / `003` land first (bolt 040) — this story (bolt 041) rebases the same
  `pipeline.ts`.

### Enables

- A trustworthy `timeout` signal for `009-recipe-import`, which will make longer calls than
  Test Connection.

## Edge Cases

| Scenario                                                           | Expected Behaviour                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Anthropic returns `stop_reason: "refusal"` with empty text         | Still `200` with (possibly empty) text — unchanged from `007`; not an error          |
| Metering write throws on a **failure** path (not the 200 branch)   | Unchanged — the `write` in the failure branch already no-ops if `logged`; acceptable |
| `callAnthropic` throws a non-timeout error just under the deadline | Mapped to `upstream_error` as today                                                  |
| Platform limit can't be determined                                 | Use a conservative `TIMEOUT_MS` (e.g. 30 s) and note the assumption                  |

## Out of Scope

- Retry/backoff strategy beyond `maxRetries: 0` (deliberate for v1).
- Streaming responses.
- Changing `est_cost_usd` maths or the rate table.
- Guaranteeing a row in the metering-write-failure case (accepted as logged-only).
