---
stage: implement
bolt: 083-photo-slots-off
created: '2026-10-18T20:15:02Z'
---

## Implementation Walkthrough: photo-slots-off

### Summary

The three photo slots now render only when a new shared constant, `SHOW_PHOTO_SLOTS`, is `true`. It
ships `false`. While it's off, the cooking view shows its cuisine icon in the meta row, and the
design guide records the slots as switched off rather than removed.

### Structure Overview

One single-constant module in `src/shared/components/`, in the same style as `tab-bar.ts`. The three
components import it and wrap their slot in a conditional, so the markup is still in the source and
nothing reaches the DOM while it's off. Each slot carries `data-testid="photo-slot"`, and the cooking
view's fallback icon carries `meta-cuisine-icon`, for the tests in Stage 3.

### Completed Work

- [x] `src/shared/components/photo-slots.ts` - the `SHOW_PHOTO_SLOTS` constant and why it is off
- [x] `src/features/dinners/components/DinnerCard.tsx` - the 76px tile renders only when the constant is on. The meta row is unchanged
- [x] `src/features/cooking-view/components/CookingViewPage.tsx` - the 44px thumb renders only when it's on. When it's off, a 13px cuisine icon leads the meta row
- [x] `src/features/weekly-plan/components/PlanPage.tsx` - the three-across card's 76px tile renders only when it's on
- [x] `memory-bank/standards/ux-guide.md` - a new "Photo slots" section listing each slot, its size and contents, and the constant

### Key Decisions

- **Conditional rendering, not CSS**: a hidden element would still take space and could still be
  found in the DOM, and FR-1 requires that the slot is absent.
- **No spacing changes**: the parent `HStack`/`Stack` gaps close up when the slot is gone, so
  nothing else needed adjusting.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- Prettier, ESLint and `tsc -b` are clean. The existing DinnerCard, CookingViewPage and PlanPage
  suites pass unchanged (41 tests), which confirms no existing test relied on a slot.
- To bring photos back, set the constant to `true` and give each slot a real image. The
  cooking view's meta-row icon then disappears on its own.
