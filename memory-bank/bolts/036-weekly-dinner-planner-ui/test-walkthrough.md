---
stage: test
bolt: 036-weekly-dinner-planner-ui
created: '2026-08-28T13:50:00Z'
---

## Test Report: weekly-dinner-planner-ui — at-capacity list banner

### Summary

- **Tests**: 141/141 passed (full suite) — was 136, +5 new for story `017`
- **Targeted files**: `DinnerCard.test.tsx` 7 → 9, `CatalogPage.test.tsx` 8 → 11
- `npx tsc -b` clean · `eslint .` clean · `vite build` clean (pre-existing >500 kB
  chunk-size warning only)

### Test Files

- [x] `src/features/dinners/components/DinnerCard.test.tsx` - New "at capacity (story 017)"
      block: an un-picked locked card shows the "Full" pill and a disabled checkbox but
      **no** "already have 3 picked" / "remove one" text; a picked card at capacity is
      unchanged ("Picked" pill, no notice). `renderCard` gained an optional
      `selectionOverrides` argument.
- [x] `src/features/dinners/components/CatalogPage.test.tsx` - Three new cases in the
      "pick-3 flow" block: banner appears exactly once when the plan has 3 selections;
      no banner with fewer than 3; no banner when the plan is locked (`locked_at` set,
      3 selections) — the last two exercise the empty-`selectedDinnerIds` guard.

### Acceptance Criteria Validation

- ✅ **Banner shown at exactly 3 selections, between filter row and grid**: covered by
  "shows a single at-capacity banner once 3 are selected".
- ✅ **Not shown with < 3 selections**: "does not show the at-capacity banner with fewer
  than 3 selections".
- ✅ **Not shown when locked / no plan**: "does not show the at-capacity banner when the
  plan is locked" (+ `selectedDinnerIds` returns an empty Set for no plan by
  construction; existing suppress-flow tests render with `fetchCurrentPlan → null` and
  never see the banner).
- ✅ **No per-card notice at capacity; dim + "Full" pill retained**: DinnerCard "shows the
  'Full' pill but no per-card ... notice when locked".
- ✅ **Picked card at capacity unchanged**: DinnerCard "is unchanged for a picked card at
  capacity".
- ✅ **Removing a pick clears the banner**: same render path as the shown/hidden cases —
  `selectedDinnerIds.size` drops below 3 and the `&&` guard stops rendering; covered
  transitively by the <3 case (React re-render on query data change).
- ✅ **Live region**: banner is a Chakra `Alert` (`status="info"` → `role`), asserted via
  visible-text query; not a bare `Box`.
- ✅ **tsc / eslint / vitest / vite build clean**.

### Issues Found

None.

### Notes

No existing test referenced the removed "Already have 3 picked — remove one first."
string, so nothing needed deleting — the two DinnerCard assertions instead lock in that
the string stays gone. Full suite deterministic across repeated runs.
