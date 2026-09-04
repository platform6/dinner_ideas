---
stage: test
bolt: 045-week-start-setting
created: '2026-09-04T02:10:00Z'
---

## Test Report: 001-week-start-setting (bolt 045)

### Summary

- **Tests**: 194/194 passed (full suite) — 4 new
- **Suites**: 27 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean on all changed files
- **Build**: `npm run build` clean

### Test Files

- [x] `src/features/settings/PlanningWeekCard.test.tsx` — new (4 tests):
  - owner sees the loaded weekday in the `Select` and changing it calls
    `updateWeekStartDay('hh-1', 6)`
  - a non-owner member gets a disabled `Select` + "Ask a household owner to change this."
  - a rejected save shows "Couldn't save that — the week start is unchanged." and the
    `Select` stays on the loaded value (query-driven, no optimistic state)
  - a failed setting query shows "Couldn't load the planning-week setting."

### Acceptance Criteria Validation

- ✅ **FR-1 migration** — `20260904020000_households_week_start_day.sql` adds `week_start_day
smallint not null default 0 check (0..6)` + a comment; no policy change; `add column if not
exists` so existing rows read `0`
- ✅ **FR-1 types** — `database.types.ts` types the column on Row (required) / Insert / Update
  (optional); `tsc -b` clean across the app
- ✅ **FR-2 read/write** — `fetchWeekStartDay` returns the household value (`?? 0`);
  `updateWeekStartDay` filters by `id`; `useUpdateWeekStartDay` invalidates the setting key
  **and** `['weekly-plan']`
- ✅ **FR-2 card** — owner can change the weekday and the mutation fires with the index;
  helper text present; load + save errors surface inline; non-owner control disabled with the
  owner pointer
- ✅ **FR-8** — default is Sunday (`0`) with no configuration; a non-owner still sees the
  correct current value
- ✅ **Regression** — all pre-existing suites green (194/194); `ClaudeAiCard` (14) and
  `settings/api` (4) unaffected

### Issues Found

None.

### Notes

- The migration is not applied here (no local `supabase` CLI); it ships as a file and is
  applied at deploy, where `database.types.ts` is regenerated from prod authoritatively.
- Owner enforcement is verified in the UI test; the real gate is the `households`
  owner-UPDATE RLS policy (unchanged, from `20260828230000`).
