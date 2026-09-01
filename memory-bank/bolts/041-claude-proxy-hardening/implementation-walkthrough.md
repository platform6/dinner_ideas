---
stage: implement
bolt: 041-claude-proxy-hardening
created: '2026-09-01T00:05:00Z'
---

## Implementation Walkthrough: claude-proxy-hardening (bolt 041)

### Summary

The Anthropic SDK client now has an explicit 45 s request `timeout` and `maxRetries: 0`, so a
slow Claude call resolves as a typed `timeout` (502) with its `ai_usage_log` row before the
Edge Function's wall-clock budget is exhausted — the `timeout` path was previously
unreachable. The success-path metering write was lifted out of the `catch`-to-`upstream_error`
scope, so an `ai_usage_log` insert that fails _after_ a billed call no longer turns a `200`
into a client-visible `502`.

### Structure Overview

Two small, surgical changes. `anthropic.ts` gains a `timeout` / `maxRetries` on the client
constructor and factors its SDK-error → `ProxyFailure` mapping into an exported pure function.
`pipeline.ts`'s 200 branch is split into two `try` blocks: one around the (fallible) Anthropic
call whose failure mapping is byte-identical to before, and one around the (now
non-fatal) success metering write.

### Completed Work

- [x] `supabase/functions/claude-proxy/anthropic.ts` — - `ANTHROPIC_TIMEOUT_MS = 45_000` exported module constant, with a comment on why it
      must stay under the platform wall-clock limit and why retries are off. - `new Anthropic({ apiKey, timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: 0 })` (was
      `{ apiKey, maxRetries: 1 }`, no timeout). - `mapAnthropicError(err): ProxyFailure` — exported pure function holding the exact
      timeout-detection regexes (`/timeout/i` / `/abort/i` on `name`, `/timed?\s*out/i` on
      `message`) plus a `ProxyFailure` pass-through; `callAnthropic`'s `catch` now just
      `throw mapAnthropicError(err)`.
- [x] `supabase/functions/claude-proxy/pipeline.ts` — 200 branch split: - `let r` assigned inside a `try` around `deps.callAnthropic` only; on throw, the same
      `ProxyFailure`-passthrough / `upstream_error` mapping + failure `write` + mapped
      status as before. - After success: `estCostUsd`, then the `ok:true` `write(...)` inside its own
      `try/catch` that `console.error`s and swallows. `200 { text, model, usage,
      latency_ms }` is returned regardless of the metering write's outcome. - Every other path (auth, resolver errors, `no_api_key`, reserve, validation catch)
      untouched.

### Key Decisions

- **`timeout` 45 s, `maxRetries: 0`** (inception OQ-3): the SDK's own docs note timeouts are
  retried by default, so leaving retries on would stack 2–3× the timeout onto the wall clock —
  exactly the failure this bolt fixes. One attempt, one ceiling.
- **`mapAnthropicError` extracted and exported**: the timeout branch was effectively dead
  code (never reached in production). Making it a pure function lets Stage 3 assert it
  directly without touching the network or the SDK.
- **`/abort/i` on the error name** added defensively — an `APIUserAbortError` (e.g. from a
  future `AbortController` backstop) reads as "took too long" to the caller. No abort path
  exists in v1; harmless.
- **Metering failure = `console.error` + `200`**: the billed result and the model text still
  reach the caller; only observability degrades. This is the single documented exception to
  the "one `ai_usage_log` row per resolved-household request" invariant (story 004 AC).

### Deviations from Plan

- None. `anthropic.test.ts` (new) and the README timeout note are Stage 3, as planned.

### Dependencies Added

- None. `@anthropic-ai/sdk@0.122.0` unchanged — `timeout` / `maxRetries` are existing client
  options (confirmed in `client.d.ts`).

### Developer Notes

- `deno check` / `deno lint` / `prettier --check` clean; all 25 existing Deno tests still
  pass (the failure-path mapping and the happy-path 200 body are unchanged).
- If the project's Edge Function plan has a wall-clock limit materially below ~120 s, lower
  `ANTHROPIC_TIMEOUT_MS` to ≈ ⅓ of it. This is the one value to re-check at deploy.
- `console.error` is the project's logging tool per `coding-standards.md`; the metering-failure
  log line is plain text with the error object appended.
