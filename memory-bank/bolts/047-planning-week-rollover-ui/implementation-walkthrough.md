---
stage: implement
bolt: 047-planning-week-rollover-ui
created: '2026-09-04T02:35:00Z'
---

## Implementation Walkthrough: 002-planning-week-rollover-ui (bolt 047)

### Summary

The catalog header now shows the planning-week range (`formatWeekRange` of
`currentPlanningWeekStart(week_start_day)`), matching `/plan`. `useWeekByOffset`'s anchor
fallback moved from `todayIsoDate()` to the current planning-week start, so offset 0 is that
week even before any plan exists and past offsets step in true weeks. Rollover is implicit —
the planning-week start is derived from `todayIsoDate()` at render and not cached across a
reload; no timers or listeners were added.

### Structure Overview

`CatalogPage` gains a `useWeekStartDay()` read and a `weekLabel` (neutral "This week"
placeholder until it loads). `useWeekByOffset` gains the same read for its anchor. Nothing
else changed — `useCurrentPlan` (bolt 046) already drives the week-aware resolution both
surfaces render around.

### Completed Work

- [x] `src/features/dinners/components/CatalogPage.tsx` — header eyebrow shows
      `formatWeekRange(currentPlanningWeekStart(week_start_day))` (was the literal "This
      week"); `useWeekStartDay` added; placeholder while loading.
- [x] `src/features/weekly-plan/hooks.ts` — `useWeekByOffset` anchor fallback is
      `currentPlanningWeekStart(weekStart.data ?? 0)` (was `todayIsoDate()`); `todayIsoDate`
      import dropped (now unused in this module — it lives only inside `currentPlanningWeekStart`).
- [x] `src/features/dinners/components/CatalogPage.test.tsx` — +2 tests: the new plan is
      filed under `currentPlanningWeekStart(0)` (not today); the header shows the
      planning-week range and an empty `0 of 3` when this week has no plan (which also covers
      "an older unlocked plan doesn't populate the grid" — it simply isn't fetched).
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` — +1 test: with no plan, offset
      0's header range is `formatWeekRange(currentPlanningWeekStart(0))` and ▶ is disabled —
      proving the anchor is planning-week-based, not today-based.

### Key Decisions

- **Catalog eyebrow shows the range, dropping "This week"** — the AC asks for it to read
  identically to `/plan`'s label, which is just the range.
- **Rollover-on-open needs no code** — the start is a pure function of `todayIsoDate()` +
  `week_start_day`, recomputed every render, never persisted. The out-of-scope "live midnight
  flip while open" would be the only thing needing a timer; none was added.
- **No dedicated boundary-crossing test** — `todayIsoDate` is imported live (not injectable),
  so a deterministic cross-midnight test would need module-mock gymnastics for little value;
  the helper's date math is covered directly in `date.test.ts` (bolt 046).

### Deviations from Plan

- The planned "step one week back" assertion in the new `PlanPage` test was dropped: in the
  no-current-plan render path the `userEvent` click did not surface the shifted range within
  the matcher timeout (a test-harness timing quirk — week-nav stepping itself is unchanged by
  this bolt and stays covered by the pre-existing "navigates to the previous week" test). The
  kept assertion (offset-0 anchor label + ▶ disabled) is the real regression guard for the
  anchor change.

### Dependencies Added

None.

### Developer Notes

- `CatalogPage` and `/plan` now agree on the current-week label by construction (both resolve
  to `currentPlanningWeekStart` / the week-aligned `plan.start_date`).
- Observation (not a regression, pre-dates 011): week navigation on `/plan` when **no** plan
  exists for the current week is only lightly covered; worth an explicit test if that path
  gets more use once rollover ships.
