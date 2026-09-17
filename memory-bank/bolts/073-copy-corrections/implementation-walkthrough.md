---
stage: implement
bolt: 073-copy-corrections
created: '2026-09-17T16:13:31Z'
---

## Implementation Walkthrough: copy-corrections

### Summary

The two stale count strings on `/plan` now read the household's `dinners_per_week`, with singular
phrasing when it is 1. The lock confirmation gained the same singular form, the stale "3" comments
were corrected, and the catalog's md+ add button now reads "Add a dinner".

### Structure Overview

All changes are copy inside existing components. The plan page's two messages are produced by two
small module-level helpers beside the component, so the phrasing lives in one place and reads the
same count the page already uses for "Pick N dinners to lock in your week". No new files, props,
hooks or data.

### Completed Work

- [x] `src/features/weekly-plan/components/PlanPage.tsx` - lock help text and full-plan message
      come from the dinner count, with singular forms; the side-by-side layout comment no longer
      says "three picks"
- [x] `src/features/weekly-plan/components/LockWeekControl.tsx` - the confirmation asks "Lock in
      this dinner?" when there is one pick, and is unchanged otherwise
- [x] `src/features/dinners/components/DinnerCard.tsx` - two doc comments describe the limit as
      `dinners_per_week` rather than 3
- [x] `src/features/dinners/components/CatalogPage.tsx` - the md+ add button's visible text is
      "Add a dinner"

### Key Decisions

- **Helpers take `dinnersPerWeek`, not `selections.length`**: both messages render only when the
  two are equal, and `dinnersPerWeek` matches the existing "Pick N dinners" line.
- **The confirmation keys on `selectionCount`**: that is the value the control already displayed,
  and it equals `dinnersPerWeek` whenever the control renders.
- **No pluralisation utility**: three call sites, English only, one household. Inline choices match
  the file's existing pattern.

### Deviations from Plan

None. Wording at N = 3 changes from "All three picked" to "All 3 dinners picked", as planned.

### Dependencies Added

None.

### Developer Notes

- `tsc -b` and `eslint` pass on the changed code.
- Vitest: 724/725. The one failure is `PlanPage.test.tsx`'s assertion on the old text
  `/all three picked/i`, which Stage 3 replaces with count-driven assertions at N = 1, 3 and 5.
- `PlanPage.test.tsx` never sets `fetchDinnersPerWeek`, so every existing test runs on the
  `?? 3` fallback. Stage 3 sets it explicitly.
