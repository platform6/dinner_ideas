---
id: 041-claude-proxy-hardening
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 004-sdk-timeout-and-metering-isolation
created: '2026-08-31T21:00:00Z'
started: '2026-08-31T23:50:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-31T23:55:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-01T00:05:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-01T00:20:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 040-claude-proxy-hardening
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 1
  testing_scope: 3
completed: '2026-08-31T23:53:38Z'
---

# Bolt: 041-claude-proxy-hardening

## Objective

Make the `timeout` outcome real and stop a metering-write failure from corrupting a paid
success (FR-4). Give the Anthropic SDK an explicit `timeout` (~⅓ of the Edge Function
wall-clock limit) and `maxRetries: 0` (OQ-3) so a slow call resolves as `502 timeout` with its
`ai_usage_log` row before the platform kills the function; move the success-path metering write
out of the `catch`-to-`upstream_error` scope so an `insertUsage` failure after a successful
call is logged, not turned into a client-visible 502.

## Stories Included

- [ ] **004-sdk-timeout-and-metering-isolation**: `new Anthropic({ apiKey, timeout, maxRetries:
    0 })`; reachable `timeout` path + row; success-path `write(...)` in its own
      log-and-swallow `try/catch` — Priority: **Must**

## Expected Outputs

- `supabase/functions/claude-proxy/anthropic.ts` — explicit `timeout: TIMEOUT_MS`,
  `maxRetries: 0`; existing timeout-error mapping now reachable; optional `AbortController`
  backstop signal
- `supabase/functions/claude-proxy/pipeline.ts` — 200 branch: build response, then meter in a
  separate `try/catch` that `console.error`s and swallows; failure/`ProxyFailure` mapping
  unchanged
- `supabase/functions/claude-proxy/README.md` — record the measured Edge runtime wall-clock
  limit and the chosen `TIMEOUT_MS`
- `supabase/functions/claude-proxy/*.test.ts` — `callAnthropic` overruns `timeout` ⇒ `502
timeout` + one row; `insertUsage` throws on the success branch ⇒ still `200` with model
  text; genuine Anthropic 5xx ⇒ `502 upstream_error` + one row (unchanged); happy path body
  byte-identical
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- **040-claude-proxy-hardening** (required) — this bolt edits the same `pipeline.ts`; land 040
  first and rebase.

### Unit Dependencies (cross-unit)

- `007-claude-integration` (committed): `anthropic.ts`, the pipeline 200/catch structure.

### External

- **Supabase Edge runtime** — first task: confirm the actual wall-clock limit; set
  `TIMEOUT_MS` to roughly a third of it. If it can't be determined, use a conservative 30 s
  and note the assumption.
- `@anthropic-ai/sdk` — pinned; only a constructor option changes.

### Enables

- Nothing within the intent. `009-recipe-import` benefits from a trustworthy `timeout`.

## Success Criteria

- [ ] `deno test` green (new + existing); `deno lint` / `deno check` clean
- [ ] A call exceeding `TIMEOUT_MS` ⇒ `502 timeout` + exactly one `ai_usage_log` row, function
      returns before platform kill
- [ ] `insertUsage` failure on the success path ⇒ caller still gets `200 { text, model, usage,
    latency_ms }`; error is `console.error`-logged, not surfaced
- [ ] Successful call + successful metering ⇒ `200` body byte-for-byte unchanged from `007`
- [ ] Genuine Anthropic 5xx / network error ⇒ `502 upstream_error` + one row (unchanged)
- [ ] `TIMEOUT_MS` and the platform limit documented in `README.md`
- [ ] Code reviewed

## Notes

`avg_uncertainty: 3` because the correct `TIMEOUT_MS` depends on a platform number that must be
measured, and simulating "the SDK call overruns the deadline" cleanly in a Deno test needs a
stubbed `callAnthropic` (fine — the pipeline already injects it). Keep the change surface tiny:
one constructor option and one `try/catch` reshuffle.
