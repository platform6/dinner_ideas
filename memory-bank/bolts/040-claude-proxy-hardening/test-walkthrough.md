---
stage: test
bolt: 040-claude-proxy-hardening
created: '2026-08-31T22:35:00Z'
---

## Test Report: claude-proxy-hardening (bolt 040)

### Summary

- **Deno pipeline tests**: 25/25 passed (`deno test --allow-env`) — 13 pre-existing (reshaped
  to the new `Deps`), 12 new for the hardening paths.
- **pgTAP**: `supabase test db` → **Result: PASS**, 227 assertions across 15 files;
  `ai_call_counter_test.sql` 17/17.
- **Type-check**: `deno check index.ts pipeline.ts anthropic.ts rates.ts errors.ts` clean.
- **Lint / format**: `deno lint` clean; `prettier --check` clean on all changed `.ts` and
  `.md` files.
- **Migration**: `supabase migration up --local` applied `20260831213000_ai_call_counter.sql`
  with no error; `supabase test db` green against the updated schema.

### Test Files

- [x] `supabase/functions/claude-proxy/index.test.ts` — pipeline unit tests over stubbed
      `Deps` (no network / DB). `makeDeps` + helpers `loaded()` / `loadErr()` reshaped to the
      new result types; 3 existing overrides updated; 12 new cases added.
- [x] `supabase/tests/database/ai_call_counter_test.sql` — pgTAP for the table shape, grants,
      RLS, and `reserve_ai_call()` behaviour (count-up-to-limit, NULL at/over limit, zero
      limit, day isolation, cross-household RLS).

### New Deno cases (intent 008 / bolt 040)

- `parsePositiveInt` — `"25/day"`, `"abc"`, `""`, `"0"`, `"-1"`, `"3.5"`, `" "`, `"NaN"` →
  `undefined`; `"10"` → 10; `"1"` → 1; `undefined` / `null` → `undefined`.
- FR-1 — `reserveCall` error ⇒ 502 `upstream_error`, one row, `callAnthropic` not called.
- FR-1 — non-finite effective `daily_call_limit` (`NaN` from config) ⇒ 502 `upstream_error`,
  one row, reserve not attempted.
- FR-1 — config-less household + `envDailyLimit: undefined` ⇒ `reserveCall` invoked with
  limit `25` (`DEFAULT_DAILY_LIMIT`).
- FR-1 — config-less household + `envDailyLimit: 10` ⇒ `reserveCall` invoked with limit `10`.
- FR-3 — `resolveHousehold` error ⇒ 502 `upstream_error`, **no** usage row.
- FR-3 — `resolveHousehold` genuine `null` ⇒ 403 `no_household` (unchanged).
- FR-3 — `loadConfig` error ⇒ 502 `upstream_error`, one row, no silent default substitution.
- FR-3 — `resolveKey` error ⇒ 502 `upstream_error` + one row; `data: null` ⇒ 409
  `no_api_key` (both asserted in one test).
- FR-2 — `bad_request` never calls `reserveCall` (cap not consumed by invalid input).
- FR-2 — happy path calls `reserveCall` exactly once, before `callAnthropic`.
- Ordering — `no_api_key` preempts `rate_limited`; `reserveCall` not reached.

### Acceptance Criteria Validation

**Story 001 — fail-closed daily cap**

- ✅ Count/reserve-query failure ⇒ no `callAnthropic`, 502 `upstream_error`, exactly one
  `ai_usage_log` row. _(Deno: "FR-1: reserveCall error …")_
- ✅ `AI_DAILY_CALL_LIMIT` non-numeric / zero / negative ⇒ `parsePositiveInt` → `undefined` ⇒
  effective default 25; `"10"` ⇒ 10. _(Deno: `parsePositiveInt`, "config-less household uses
  DEFAULT_DAILY_LIMIT / envDailyLimit")_
- ✅ Non-finite effective limit treated as "cannot verify" ⇒ 502, not "no cap". _(Deno:
  "non-finite effective daily_call_limit …")_

**Story 002 — genuine-usage-only, atomic cap**

- ✅ Cap counts only real attempts: `bad_request` / `no_api_key` / `rate_limited` never bump
  `ai_call_counter` (structural — bumped only in `reserveCall`). _(Deno: "bad_request never
  calls reserveCall", "no_api_key preempts rate_limit"; pgTAP: zero row created at limit 0)_
- ✅ Atomic reserve: `reserve_ai_call` counts 1→2→3 then `NULL` at limit 3; `ON CONFLICT DO
UPDATE … WHERE n < limit` row-locks concurrent callers. _(pgTAP: "reserve #1..#4"; the
  row-lock is structural — a true multi-session race is not expressible in a single-session
  pgTAP transaction, noted below)_
- ✅ Day isolation: a prior-day counter row does not affect today's count. _(pgTAP: "reserve
  for B today returns 1 despite a prior-day n=99")_
- ✅ `007` FR-5 still holds: 1..N succeed, N+1 → 429 + one row; a `daily_call_limit` change
  takes effect on the next call (limit is passed per-call). _(Deno: reshaped "rate_limited …"
  test; pgTAP: limit passed as `p_limit` arg)_

**Story 003 — surfaced resolver errors**

- ✅ `resolveHousehold` / `loadConfig` / `resolveKey` errors ⇒ 502 `upstream_error`, never
  `no_household` / `no_api_key` / silent config defaults. _(Deno: three "FR-3: … error →
  502" tests)_
- ✅ Genuine "no row" unchanged: `no_household` (403, no row), `no_api_key` (409, one row).
  _(Deno: "resolveHousehold genuine null → 403", "resolveKey … distinct from data:null → 409",
  plus the untouched `007` `no_household` / `no_api_key` tests)_

**Cross-cutting**

- ✅ Metering invariant (exactly one row per resolved-household request) holds on every path
  touched — success, `rate_limited`, `no_api_key`, `bad_request`, and every new 502
  fail-closed path assert `rows.length === 1`; the pre-household `resolveHousehold`-error path
  asserts `rows.length === 0`.
- ✅ Frozen contract unchanged: no new `error_code`; happy-path 200 body byte-identical
  (`007` "happy path" test passes unchanged).
- ✅ `ai_call_counter` grants: `service_role` can execute `reserve_ai_call`, `authenticated`
  cannot; no client write policy; RLS member-read isolation. _(pgTAP)_

### Issues Found

None. Two SQL-authoring slips fixed during the run: my first `ai_call_counter_test.sql` was
run before `migration up` (relation missing), and two test descriptions used `"…"` (SQL
identifier quoting) instead of `'…'` — both corrected, final run green.

### Notes

- A genuine concurrent-reserve race can't be expressed inside one pgTAP transaction. The
  atomicity guarantee is structural: `INSERT … ON CONFLICT (household_id, day) DO UPDATE …
WHERE n < p_limit` takes a row lock on the counter row, so overlapping callers serialise and
  the `WHERE` re-evaluates per caller. The pipeline tests confirm `handleProxy` faithfully
  acts on whatever `reserveCall` returns.
- `supabase test db` runs against the local dev DB; it needed `supabase migration up --local`
  first because the new migration wasn't yet applied there. On a fresh `supabase db reset` the
  migration is picked up automatically.
- No frontend impact — bolt 040 touches only `supabase/`. `src/features/ai/api.ts` (its own
  `callClaude`) is bolt 042 (unit 002).
