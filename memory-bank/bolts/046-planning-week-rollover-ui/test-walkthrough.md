---
stage: test
bolt: 046-planning-week-rollover-ui
created: '2026-09-04T02:24:00Z'
---

## Test Report: 002-planning-week-rollover-ui (bolt 046)

### Summary

- **Tests**: 203/203 passed (full suite) — 9 new
- **Suites**: 27 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean
- **Build**: `npm run build` clean

### Test Files

- [x] `src/features/weekly-plan/date.test.ts` — +9 tests for `planningWeekStart` /
      `currentPlanningWeekStart` (all weekdays, boundary/adjacent, month + year wrap, DST
      week, purity). Verified expected values against `Date.getDay()` for each reference date.
- [x] `PlanPage.test.tsx` / `ShoppingListPage.test.tsx` / `CatalogPage.test.tsx` /
      `CookingViewPage.test.tsx` — `fetchWeekStartDay` mock added so `useCurrentPlan` resolves
      under the new week-aware gate. All pre-existing assertions pass unchanged.
- [x] `toggle-selection.test.ts` — untouched (the pure `decideToggleAction` contract did not
      change); 6/6 green.

### Acceptance Criteria Validation

- ✅ **FR-3** — `planningWeekStart` returns the most recent date ≤ input on the given weekday
  (itself when already on it); whole-date local math; DST week → 7 calendar days; pure
- ✅ **FR-4** — `useCurrentPlan` fetches the plan for `currentPlanningWeekStart(week_start_day)`
  via `fetchCurrentPlan`→`fetchPlanByStartDate`; `null` when none; disabled until
  `week_start_day` loads; keyed on the planning-week start; `['weekly-plan','current']`
  invalidation prefix still refreshes it
- ✅ **FR-4** — consumer audit done and recorded (walkthrough): no consumer regressed, none
  needed "latest regardless of week"
- ✅ **FR-5** — `useToggleSelection` `create-and-add` stamps
  `currentPlanningWeekStart(week_start_day ?? 0)`; `todayIsoDate()` is no longer a plan
  `start_date` anywhere (still only the `useWeekByOffset` anchor fallback, moved in 047)
- ✅ **Regression** — full suite 203/203; `weekly-plan`, `dinners`, `shopping-list`,
  `cooking-view`, `settings` all green

### Issues Found

None.

### Notes

- The rollover-boundary end-to-end test and the `useWeekByOffset` anchor change are bolt 047
  (stories 004–006).
- Known transient (047 closes it): a current week with no plan shows a today-anchored range
  label on `/plan` until the anchor swap.
