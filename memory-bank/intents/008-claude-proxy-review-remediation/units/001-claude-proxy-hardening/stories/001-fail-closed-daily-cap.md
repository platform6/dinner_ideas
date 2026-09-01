---
id: 001-fail-closed-daily-cap
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
status: complete
priority: must
created: '2026-08-31T21:00:00Z'
assigned_bolt: 040-claude-proxy-hardening
implemented: true
---

# Story: 001-fail-closed-daily-cap

## User Story

**As** the household paying for Anthropic calls
**I want** the daily call cap to hold even when a query or a config value is broken
**So that** a transient database blip or a typo'd env var can't quietly hand out unlimited paid calls

## Context

- `countToday` (`supabase/functions/claude-proxy/index.ts`) destructures only `{ count }` and
  returns `count ?? 0`. A PostgREST error ⇒ `count` is `undefined` ⇒ `used = 0` ⇒
  `used >= cfg.daily_call_limit` (`pipeline.ts:204`) is never true ⇒ unbounded paid calls
  until the DB recovers. (Review finding 3, count path.)
- `deps.envDailyLimit` is `Deno.env.get('AI_DAILY_CALL_LIMIT') ? Number(...) : undefined`.
  A non-numeric value (`"25/day"`) is a truthy string ⇒ `Number("25/day")` = `NaN`, and
  `deps.envDailyLimit ?? DEFAULT_DAILY_LIMIT` (`pipeline.ts:199`) keeps `NaN` ⇒ `used >= NaN`
  is always false ⇒ no cap for any config-less household. (Review finding 7.)

## Acceptance Criteria

- [ ] **Given** `countToday`'s query returns a PostgREST `error`, **When** `handleProxy` runs,
      **Then** it does **not** call `callAnthropic`, returns `502 { error_code: 'upstream_error' }`,
      and writes exactly one `ai_usage_log` row (`ok=false, error_code='upstream_error'`).
- [ ] **Given** `countToday` succeeds, **When** it returns a real count, **Then** behaviour is
      unchanged from today (including `count = 0`).
- [ ] **Given** `AI_DAILY_CALL_LIMIT` is `"25/day"`, `"abc"`, `""`, or unset, **When** the
      function initialises, **Then** `deps.envDailyLimit` is `undefined` (never `NaN`), so a
      household with no `household_ai_config` row gets `daily_call_limit = DEFAULT_DAILY_LIMIT`
      (25).
- [ ] **Given** `AI_DAILY_CALL_LIMIT = "10"`, **When** the function initialises, **Then** the
      effective default limit is `10` (numeric parsing still works).
- [ ] **Given** any path where the effective `daily_call_limit` is somehow non-finite, **When**
      the cap is checked, **Then** it is treated as "cannot verify" (`upstream_error`), not as
      "no limit".

## Technical Notes

- `countToday`: capture `{ count, error }`; on `error` throw/return a sentinel the pipeline
  maps to `ProxyFailure('upstream_error', …, 502)` **before** the Anthropic call, going
  through the existing `write(...)` so the one-row invariant holds.
- Env parse: a small helper — `const n = Number(raw); return Number.isInteger(n) && n > 0 ? n
: undefined;` — at the `index.ts` env-read site. Optionally also guard in `pipeline.ts`
  where the `?? DEFAULT_DAILY_LIMIT` fallback is applied.
- This is `error_code` reuse, not a contract change (OQ-1).

## Dependencies

### Requires

- None — first story in the unit; shares `index.ts` / `pipeline.ts` with stories 002–004.

### Enables

- `002-count-genuine-usage-atomic-cap` builds the atomic check on top of a count that can now
  report failure.

## Edge Cases

| Scenario                                                | Expected Behaviour                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Count query succeeds with `count = null` (no rows)      | Treated as `0` — genuine empty, not an error                                                                    |
| `AI_DAILY_CALL_LIMIT = "0"`                             | `undefined` (not a positive integer) ⇒ falls back to `DEFAULT_DAILY_LIMIT`; a real "0" cap is out of scope here |
| `household_ai_config.daily_call_limit` itself is `NULL` | `007` schema says `not null default 25`; if somehow null, treat as "cannot verify"                              |

## Out of Scope

- The atomic check-and-reserve (story 002) and counting only genuine-usage rows (story 002).
- Resolver error handling for household/config/key (story 003).
- Allowing an operator to set an unlimited or zero cap deliberately.
