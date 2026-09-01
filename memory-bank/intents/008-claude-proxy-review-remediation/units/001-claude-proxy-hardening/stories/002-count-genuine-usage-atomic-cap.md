---
id: 002-count-genuine-usage-atomic-cap
unit: 001-claude-proxy-hardening
intent: 008-claude-proxy-review-remediation
status: complete
priority: must
created: '2026-08-31T21:00:00Z'
assigned_bolt: 040-claude-proxy-hardening
implemented: true
---

# Story: 002-count-genuine-usage-atomic-cap

## User Story

**As** the household paying for Anthropic calls
**I want** the daily cap to count only real calls and to hold when calls arrive at once
**So that** a flood of malformed requests can't lock me out, and concurrency can't blow past the limit

## Context

- **Wrong rows counted.** `countToday` counts _every_ `ai_usage_log` row since UTC midnight,
  and the outer `catch` in `pipeline.ts` (line 254) writes a row for `bad_request` / JSON
  failures. A caller looping invalid requests fills the daily budget with
  `error_code='bad_request'` rows and gets `rate_limited` for everyone until UTC midnight.
  (Review finding 5.)
- **Check-then-act race.** `countToday` is read at `pipeline.ts:203`; the usage row is
  inserted at line 227, after the Anthropic call. Concurrent requests all read the same
  `used`, all pass `used >= daily_call_limit`, all call Anthropic. (Review finding 6.)

## Acceptance Criteria

- [ ] **Given** the daily-usage count, **When** it is computed, **Then** it counts only rows
      with `ok = true` **or** `error_code IN ('rate_limited', 'upstream_error', 'timeout')` —
      rows with `error_code IN ('bad_request', 'no_api_key', 'no_household')` do **not** count.
- [ ] **Given** 50 sequential invalid-JSON requests for a household otherwise under limit,
      **When** a valid request follows, **Then** it is **not** `rate_limited`.
- [ ] **Given** `daily_call_limit = N` and `N − 1` genuine-usage rows for the UTC day,
      **When** 10 requests arrive concurrently, **Then** at most one reaches `callAnthropic`
      and the rest return `429 rate_limited` with one row each; the household never makes more
      than `N` paid Anthropic calls in the UTC day.
- [ ] **Given** the cap check, **When** it passes, **Then** the slot is reserved in the same
      atomic DB operation that will hold the usage row — no window between "counted" and
      "inserted" in which another request can also pass.
- [ ] **Given** `007`'s FR-5 acceptance criteria (calls `1..N` succeed, `N+1` → `429` + one
      row; `daily_call_limit` change takes effect with no deploy), **When** re-run, **Then**
      they still pass.

## Technical Notes

- **Migration** (`supabase/migrations/<ts>_atomic_daily_call_cap.sql`, append-only): an atomic
  primitive — recommended a `security definer` function
  `reserve_ai_call(p_household_id uuid, p_limit int, p_row jsonb) returns uuid` that does
  `INSERT INTO ai_usage_log … SELECT … WHERE (SELECT count(*) FROM ai_usage_log WHERE
household_id = p_household_id AND created_at >= date_trunc('day', now() at time zone 'utc')
AND (ok OR error_code IN ('rate_limited','upstream_error','timeout'))) < p_limit
RETURNING id`. A `NULL` return ⇒ over limit. (OQ-4 — a guarded bare `INSERT … SELECT …
WHERE` from the function is an acceptable alternative; per-`household_id` advisory lock is
  the fallback.)
- **Pipeline**: the genuine-usage rate-limited row and the success/failure rows all flow
  through this one reserve/insert path so the invariant "exactly one row per
  resolved-household request" still holds. The `bad_request` outer-catch row is still written
  (for visibility) but no longer counts toward the cap by virtue of the `WHERE` filter.
- Partial index on `ai_usage_log (household_id, created_at) WHERE ok OR error_code IN (…)` if
  the count is measured to be slow (it won't be at this scale).

## Dependencies

### Requires

- `001-fail-closed-daily-cap` — the count must be able to report failure before this story
  wraps it in an atomic reserve.

### Enables

- `009-recipe-import` (future) inherits a cap that actually bounds spend.

## Edge Cases

| Scenario                                                | Expected Behaviour                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The reserve function itself errors                      | Treated as "cannot verify" ⇒ `502 upstream_error` + one row (per story 001)            |
| A row is written by the outer `catch` for `bad_request` | Written, visible in `ai_usage_log`, excluded from the cap count                        |
| `timeout` / `upstream_error` genuine-failure rows       | **Count** toward the cap — the household did cause a (paid or attempted) upstream call |
| Two requests race to be the Nth call                    | Exactly one wins the atomic insert; the other gets `rate_limited`                      |

## Out of Scope

- Per-feature sub-quotas, hourly buckets, or token-based (rather than call-count) limits.
- Changing `DEFAULT_DAILY_LIMIT` or the `household_ai_config.daily_call_limit` default.
- Retroactively deleting the `bad_request` rows already written by the deployed function.
