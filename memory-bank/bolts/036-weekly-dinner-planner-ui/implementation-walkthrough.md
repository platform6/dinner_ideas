---
stage: implement
bolt: 036-weekly-dinner-planner-ui
created: '2026-08-28T13:30:00Z'
---

## Implementation Walkthrough: weekly-dinner-planner-ui — at-capacity list banner

### Summary

Removed the per-card "Already have 3 picked — remove one first." inline notice from
`DinnerCard`, and added a single `Alert` banner to `CatalogPage` shown while the current
week's plan holds 3 selections. The catalog now explains the at-capacity state once, at
the top of the list, instead of repeating one sentence on every dimmed un-picked card.

### Structure Overview

No structural change. Two existing components edited; no new files, props, hooks, state,
or packages. `CatalogPage` already derives `selectedDinnerIds` (a Set that is empty when
the plan is missing or locked), so the banner's visibility is a single `size >= 3`
expression with no new data flow. The card's other at-capacity treatment — `opacity 0.55`
on the wrapper and the "Full" pick pill (locked icon + disabled) — is untouched.

### Completed Work

- [x] `src/features/dinners/components/DinnerCard.tsx` - Deleted the `isLocked` inline
      `notice` block. `isLocked` is still computed and still drives the card's `opacity`
      and the `PickPill` "Full" branch, so no imports or variables became unused
      (`Alert`/`AlertIcon` remain used by an unrelated error state in the same file).
- [x] `src/features/dinners/components/CatalogPage.tsx` - Added an `Alert`
      (`status="info"`, matching the two existing error alerts in this file) between the
      `CatalogFilters` row and the loading/error/grid blocks, rendered only when
      `selectedDinnerIds.size >= 3`. Copy: "You've picked 3 for this week — remove one to
      swap in another." A short comment notes why `size >= 3` alone is a sufficient guard.

### Key Decisions

- **Chakra `Alert status="info"` over reusing `layerStyle="notice"`**: the two existing
  page-level messages in `CatalogPage` are already `Alert`s, so this matches the page's
  own pattern and gets an accessible live region (`role`) for free. The terracotta
  `notice` layerStyle stays available for other inline uses.
- **Guard on `selectedDinnerIds.size >= 3` only**: that memo already returns an empty Set
  for a missing or locked plan, so the "don't show when locked / no plan" acceptance
  criteria fall out without an extra condition.
- **Placement between filters and grid**: keeps the banner grouped with the other
  page-level alerts and avoids reflowing the dinner grid when it appears/disappears.

### Deviations from Plan

None. (Plan already anticipated that `Alert`/`AlertIcon` might stay imported in
`DinnerCard` — they do, via a separate error state.)

### Dependencies Added

None.

### Developer Notes

- No existing test referenced the removed string, so nothing had to be deleted from
  `DinnerCard.test.tsx`; new coverage is added in Stage 3.
- Verification run in Stage 2: `npx tsc -b` clean, `eslint` clean on both files,
  `vite build` clean (the pre-existing >500 kB chunk-size warning is unrelated), and the
  full `vitest` suite still green at 136/136 with no new tests yet.
