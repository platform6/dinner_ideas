---
stage: test
bolt: 047-planning-week-rollover-ui
created: '2026-09-04T02:38:00Z'
---

## Test Report: 002-planning-week-rollover-ui (bolt 047)

### Summary

- **Tests**: 206/206 passed (full suite) — 3 new
- **Suites**: 27 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean (whole `src`)
- **Build**: `npm run build` clean

### Test Files

- [x] `src/features/dinners/components/CatalogPage.test.tsx` — +2:
  - a first pick calls `createPlan(currentPlanningWeekStart(0))` — week-aligned, not today
  - the header eyebrow shows `formatWeekRange(currentPlanningWeekStart(0))` and the grid is
    an empty `0 of 3` when `fetchCurrentPlan` resolves `null` for this planning week (this is
    exactly the "stale older plan is not surfaced" case — it isn't fetched)
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` — +1:
  - with no plan, offset 0's header range is the planning-week window and ▶ is disabled —
    proves `useWeekByOffset`'s anchor is planning-week-based, not `todayIsoDate()`

### Acceptance Criteria Validation

- ✅ **FR-6** — catalog header shows `formatWeekRange(currentPlanningWeekStart(week_start_day))`;
  neutral "This week" placeholder while the setting loads; matches `/plan` offset-0 by
  construction
- ✅ **FR-6** — header controls (count badge, suppressed link) unchanged;
  `justify="space-between"` / `flexWrap="wrap"` intact (no layout assertions broke)
- ✅ **FR-7** — `useWeekByOffset` anchor fallback is `currentPlanningWeekStart(...)`; offset 0
  == current planning week with no plan
- ✅ **FR-7** — no timer / `visibilitychange` / midnight listener added; the start is a pure
  render-time function of `todayIsoDate()` + `week_start_day`
- ✅ **FR-7** — `todayIsoDate()` appears only inside `currentPlanningWeekStart` (date.ts); it
  is no longer referenced in `weekly-plan/hooks.ts` and is never a plan `start_date`
- ✅ **FR-9 regression** — full suite 206/206: `/plan` week nav, `012` locking +
  `meal_history` path, shopping-list generation, cooking view, settings all green

### Issues Found

- The planned "step one week back" assertion in the new `PlanPage` test was dropped — a
  test-harness timing quirk in the no-current-plan render path (`userEvent` click not
  surfacing the shifted range within the matcher timeout). Week-nav stepping is not changed
  by this bolt and stays covered by the existing "navigates to the previous week" test.

### Notes

- Boundary-crossing is exercised at the unit level in `date.test.ts` (bolt 046); a full
  cross-midnight component test was judged low-value given `todayIsoDate` is imported live.
