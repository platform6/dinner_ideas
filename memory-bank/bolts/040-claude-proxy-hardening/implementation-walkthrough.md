---
stage: implement
bolt: 040-claude-proxy-hardening
created: '2026-08-31T22:05:00Z'
---

## Implementation Walkthrough: claude-proxy-hardening (bolt 040)

### Summary

The `claude-proxy` daily-call cap and its dependency resolvers were made fail-closed. The cap
is now enforced by an atomic per-household / per-UTC-day counter row instead of a
non-atomic live `count(*)` over `ai_usage_log`; a broken usage count, a non-numeric
`AI_DAILY_CALL_LIMIT`, or a failed household / config / key lookup now surface as
`upstream_error` (502) rather than an unbounded run of paid calls or a misleading
`no_household` / `no_api_key`. The frozen request/response contract and the 200 happy-path
body are unchanged; the `error_code` enum is untouched.

### Structure Overview

`pipeline.ts` stays I/O-free — every new branch is reachable through the injected `Deps`, so
the pure-`handleProxy` test style carries over. Three `Deps` methods changed shape from
"return the value or a fallback" to "return a result that distinguishes a query error from a
genuine empty", and the non-atomic `countToday` was replaced by an atomic `reserveCall`
backed by a new `security definer` SQL function. `index.ts` wires the real Supabase calls to
the new shapes; a new `rates.ts` helper parses the env limit safely.

### Completed Work

- [x] `supabase/migrations/20260831213000_ai_call_counter.sql` — new append-only migration:
      `ai_call_counter (household_id, day, n)` table (client-write revoked, RLS on, member
      `select` only) and `reserve_ai_call(p_household_id, p_limit)` — a `security definer`
      SQL function that atomically upserts the day's counter row and returns the new count,
      or `NULL` at/over the limit. Execute granted to `service_role` only. Includes a
      ROLLBACK block.
- [x] `supabase/functions/claude-proxy/rates.ts` — added `parsePositiveInt(raw)`: returns a
      positive integer or `undefined` for a missing/non-numeric/zero/negative value (never
      `NaN`). Exported for reuse and testing.
- [x] `supabase/functions/claude-proxy/pipeline.ts` — - New exported types: `ConfigRow`, `Loaded<T>` (`{ data, error }` discriminated
      result), `Reservation` (`{ ok: true, n } | { ok: false, reason }`). - `Deps` updated: `resolveHousehold` / `loadConfig` / `resolveKey` now return
      `Loaded<…>`; `countToday` removed; `reserveCall(householdId, limit)` added. - `handleProxy` reworked: a `resolveHousehold` error → 502 with no usage row (before
      the one-row boundary, matching 007); a `loadConfig` error → 502 + one row (no silent
      default substitution); a non-finite effective `daily_call_limit` → 502 + one row; a
      `resolveKey` error → 502 + one row, distinct from `data: null` → 409 `no_api_key`;
      the rate-limit step calls `reserveCall` — `reason: 'error'` → 502 + row,
      `reason: 'over_limit'` → 429 `rate_limited` + row. - **Ordering change**: the key check now runs _before_ the rate-limit reserve, so a
      `no_api_key` attempt never advances the daily counter. See Key Decisions.
- [x] `supabase/functions/claude-proxy/index.ts` — - `resolveHousehold` / `loadConfig` / `resolveKey` now inspect the PostgREST `error`
      and return `{ data, error }`; added `reserveCall` wired to `rpc('reserve_ai_call')`
      (a `null`/`undefined` return → `over_limit`, an `error` → `error`). - `envDailyLimit` now uses `parsePositiveInt(Deno.env.get('AI_DAILY_CALL_LIMIT'))`. - Header contract comment: the "intent 008" reference (recipe-import) updated to
      "intent 009"; added a line stating backend-side failures fail closed as
      `upstream_error`.
- [x] `supabase/functions/claude-proxy/index.test.ts` — `makeDeps` reshaped to the new
      `Deps` (helpers `loaded()` / `loadErr()`); the three existing overrides
      (`no_household`, `rate_limited`, `no_api_key`) and the model-resolution test updated to
      the new shapes. All 13 existing tests pass unchanged in intent. (New coverage for the
      hardening paths + pgTAP is Stage 3.)

### Key Decisions

- **Atomic counter table over a live `count(*)`** (Option A from the plan, approved): a
  `select count(*) … < limit` inside an insert is not atomic under READ COMMITTED. The
  `INSERT … ON CONFLICT (household_id, day) DO UPDATE SET n = n + 1 WHERE n < p_limit
RETURNING n` row-locks the counter row, so concurrent callers serialise; a `NULL` return
  means at/over limit. `ai_usage_log` stays fully append-only.
- **"Genuine usage only" is structural, not a filter**: the counter is bumped only in
  `reserveCall`, immediately before a real Anthropic attempt — so `bad_request`,
  `no_api_key`, and `rate_limited` inherently never consume the cap. No `error_code`
  filtering logic needed anywhere.
- **Key check before rate-limit reserve**: required so a `no_api_key` attempt doesn't bump
  the counter. Consequence: a household that is _both_ over-limit _and_ has no key now sees
  `409 no_api_key` instead of `429 rate_limited`. Deliberate — `no_api_key` is the
  actionable problem, and 007's tests don't exercise both at once.
- **Fail-closed code is `upstream_error` (502)** for every backend-side failure (count /
  household / config / key), per inception OQ-1 — the frozen `error_code` enum is not
  extended.
- **`p_limit < 1` handled in SQL**: the `WHERE p_limit >= 1` guard on the INSERT's SELECT
  means a zero/negative limit yields no row and `reserve_ai_call` returns `NULL` (always
  rate-limited) rather than creating an `n = 1` row.
- **`parsePositiveInt` lives in `rates.ts`** alongside the other limit constants, rather than
  inline in `index.ts`, so Stage 3 can unit-test it directly.

### Deviations from Plan

- Migration timestamp is `20260831213000` (as planned).
- No `finalize_ai_call` / `ai_usage_log` UPDATE — the counter-table approach keeps the audit
  log insert-only, so the reserve/finalize split discussed under "Option A" in the plan was
  not needed. `insertUsage` is unchanged.
- `decision-index.md` entry and `README.md` update: deferred to alongside the Stage 3 test
  report so all bolt-040 doc edits land together (also keeps FR-4's README timeout note, in
  bolt 041, from colliding).

### Dependencies Added

- None. No new npm/Deno package; `@anthropic-ai/sdk` and `@supabase/supabase-js` unchanged.

### Developer Notes

- If the function dies between `reserveCall` and `callAnthropic`, the household loses one slot
  for the day. Fail-safe (never overspends); accepted for v1, not compensated.
- The counter and `ai_usage_log` row counts will not match exactly — they measure different
  things (reserved attempts vs. logged outcomes). This is expected and noted in the table
  comment.
- Old `ai_call_counter` rows (past days) are inert; a prune job is a later, non-blocking
  concern.
- `deno check` + `deno lint` + `prettier --check` are clean on the production files;
  `index.test.ts` currently has two "unused" lint hits (`loadErr`, `parsePositiveInt`) that
  the Stage 3 cases will consume.
