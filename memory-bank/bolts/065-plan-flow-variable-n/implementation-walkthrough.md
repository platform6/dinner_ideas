---
stage: implement
bolt: 065-plan-flow-variable-n
created: '2026-09-08T21:00:00Z'
---

## Implementation Walkthrough: 002-plan-flow-variable-n

### Summary

Every screen now reads `households.dinners_per_week` instead of a hard-coded 3. Seven files,
nineteen sites. The setting built in bolts 063 and 064 stops being inert.

### Structure Overview

Each page calls `useDinnersPerWeek()` and falls back to 3 while the query is in flight. The two
data hooks take the count as a parameter rather than reading it themselves, so a page reads the
setting once and uses the same value for its gate and its query — two readings that could disagree
is the class of bug this intent exists to remove.

`LockWeekControl` takes it as a prop. It is presentational and should stay so.

### Completed Work

- [x] `dinners/components/CatalogPage.tsx` - badge variant, "N of M", capacity alert and its copy,
      and `selectionDisabled`
- [x] `weekly-plan/components/PlanPage.tsx` - `isFull`, the nudge condition and copy, the lock condition
- [x] `weekly-plan/components/LockWeekControl.tsx` - new required `dinnersPerWeek` prop
- [x] `shopping-list/components/ShoppingListPage.tsx` - gate and copy
- [x] `shopping-list/hooks.ts` - `enabled` at N
- [x] `cooking-view/components/CookingViewPage.tsx` - gate and copy
- [x] `cooking-view/hooks.ts` - `enabled` at N

### Key Decisions

- **The re-grep found a seventh file.** `CatalogPage.tsx` was not in the unit brief's list and holds
  five sites, including `selectionDisabled`. Without that one, a household set to 5 could never pick
  a fourth dinner from the UI whatever the database allowed - a setting that saves, passes its own
  tests, and does nothing. The brief's list was a snapshot and its own story said to re-run it.
- **`?? 3` at each call site.** It is the column default, so a household that never touched the
  setting sees no flicker and an offline read degrades to today's behaviour rather than to zero.
  Not extracted to a constant: it appears once per file, and an import would say less than `3` does.
- **Hooks take the count as a parameter**, pages read it. One read per page, used for both the gate
  and the query.
- **Singular handled** wherever a string can render at 1 - "Pick 1 dinner", not "Pick 1 dinners".
- **Nothing became enforcement.** These are affordances; the cap and the lock rule live in bolt
  063's triggers. `selectionDisabled`'s two in-flight guards are unrelated to N and were left
  exactly as they were - their comment describes a real race.

### Deviations from Plan

None in the implementation. The plan's file list was already corrected during Stage 1, when the
re-grep found `CatalogPage.tsx`.

### Dependencies Added

None.

### Developer Notes

- `LockWeekControl`'s new prop is **required**, not defaulted. A default would let a caller forget
  it and silently get 3. Its existing test file needed the prop in two places - a fixture change,
  with no assertion relaxed.
- A grep for hard-coded selection counts across `src/` now returns only `last-chosen.ts`'s `< 30`
  and `< 365`, which are day counts.
