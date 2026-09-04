---
stage: implement
bolt: 046-planning-week-rollover-ui
created: '2026-09-04T02:22:00Z'
---

## Implementation Walkthrough: 002-planning-week-rollover-ui (bolt 046)

### Summary

"Current plan" is now _this planning week's plan_, not "the newest plan by `created_at`". Added
pure `planningWeekStart` / `currentPlanningWeekStart` date helpers; `useCurrentPlan` resolves
the plan for `currentPlanningWeekStart(week_start_day)` and is `null` when that week has no
plan; new plans are stamped with the planning-week start. Four consumer test files gained a
`fetchWeekStartDay` mock.

### Structure Overview

`useCurrentPlan` composes `useWeekStartDay()` (bolt 045) with the new date helper to derive a
`startDate`, then queries `fetchCurrentPlan(startDate)` — which now just delegates to
`fetchPlanByStartDate`. The query is disabled until `week_start_day` loads and is keyed on the
planning-week start, so a rollover or a settings change refetches. `currentPlanKey`
(`['weekly-plan','current']`) stays the invalidation prefix, so `useToggleSelection` /
`useLockPlan` `invalidateQueries` calls are unchanged.

### Completed Work

- [x] `src/features/weekly-plan/date.ts` — `planningWeekStart(isoDate, weekStartDay)` (walk
      back `((getDay() - weekStartDay + 7) % 7)` calendar days; reuses `parseLocalDate` /
      `toIsoDate`) and `currentPlanningWeekStart(weekStartDay)`.
- [x] `src/features/weekly-plan/date.test.ts` — +9 tests: boundary date returns itself;
      ±1 day; all seven `weekStartDay` values from one reference date; month + year wrap; a
      DST-transition week still spans 7 calendar days; purity; `currentPlanningWeekStart`
      anchored on today.
- [x] `src/features/weekly-plan/api.ts` — `fetchCurrentPlan()` → `fetchCurrentPlan(startDate:
    string)`, delegating to `fetchPlanByStartDate`. Docstring updated.
- [x] `src/features/weekly-plan/hooks.ts` — `useCurrentPlan` resolves by planning-week start
      (disabled until `week_start_day` loads; query key `[...currentPlanKey, startDate]`);
      `useToggleSelection`'s `create-and-add` branch calls
      `createPlan(currentPlanningWeekStart(weekStartDay ?? 0))`. `useWeekByOffset` unchanged
      (its anchor fallback moves in bolt 047).
- [x] `PlanPage.test.tsx`, `ShoppingListPage.test.tsx`, `CatalogPage.test.tsx`,
      `CookingViewPage.test.tsx` — added `vi.mock('@/features/settings/api')` +
      `vi.mocked(fetchWeekStartDay).mockResolvedValue(0)` in `beforeEach` (CatalogPage: both
      `describe` blocks). No resolver-mock changes — `fetchCurrentPlan`'s new `startDate` arg
      is ignored by the mock.

### Consumer Audit (story 002 gate — result)

| Consumer              | Verdict                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CatalogPage`         | correct as-is — `null` plan already yields empty `0 of 3`; older unlocked plans simply aren't fetched       |
| `PlanPage` (offset 0) | correct — `useWeekByOffset` offset-0 uses `useCurrentPlan` directly; header range label follows in bolt 047 |
| `ShoppingListPage`    | correct — builds from the current planning week's plan                                                      |
| `CookingViewPage`     | correct — cooks the current planning week's plan (locked or not)                                            |
| `useToggleSelection`  | snapshot semantics unchanged; only the created plan's `start_date` moves                                    |

No consumer wanted "newest plan regardless of week" — the old `fetchCurrentPlan` semantics are
fully retired.

### Deviations from Plan

None. `decideToggleAction` / `toggle-selection.ts` did **not** need changing — the plan
`start_date` is chosen entirely in `useToggleSelection`, so its pure-function contract is
untouched (its 6 tests stay green).

### Dependencies Added

None. `weekly-plan/hooks.ts` now imports `useWeekStartDay` from `@/features/settings/hooks`.

### Developer Notes

- Transient until bolt 047: for a current week with **no** plan, `useWeekByOffset`'s
  `todayIsoDate()` anchor makes `PlanPage`'s range label start on today rather than the
  planning-week start. Story 005 (bolt 047) swaps that anchor to `currentPlanningWeekStart`.
- `fetchCurrentPlan` kept as a named delegate so the four component test suites keep their
  existing mock points.
