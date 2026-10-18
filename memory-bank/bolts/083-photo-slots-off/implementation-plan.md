---
stage: plan
bolt: 083-photo-slots-off
created: '2026-10-18T20:12:32Z'
---

## Implementation Plan: photo-slots-off

### Objective

The three photo slots stop rendering while one shared constant is `false`. The cooking view keeps its
cuisine icon by moving it into the meta row. Setting the constant to `true` restores today's
rendering exactly.

### Deliverables

- `src/shared/components/photo-slots.ts`: a new file containing `export const SHOW_PHOTO_SLOTS = false`
  and a doc comment saying what it gates and why it's off. It follows `tab-bar.ts`, a one-constant
  shared module.
- `DinnerCard.tsx`: the 76px tile renders only when `SHOW_PHOTO_SLOTS` is `true`. The meta row is
  unchanged.
- `CookingViewPage.tsx`: the 44px thumb renders only when the constant is `true`. When it's
  `false`, a 13px / 1.8 cuisine icon leads the meta row.
- `PlanPage.tsx`: the three-across card's 76px `Box` renders only when the constant is `true`.
- Each slot element gets `data-testid="photo-slot"` so tests can find it.
- `memory-bank/standards/ux-guide.md`: a new "Photo slots" section listing the three slots and the
  constant, and saying they're off until photos exist.
- Tests in the three existing test files, covering both values.

### Dependencies

- None. No new packages and no schema or API change.
- Bolt 082 is committed (`6179850`), so there's no conflict with `StoreConfigPage.tsx`.

### Technical Approach

- **Gate with `&&`, not CSS.** `{SHOW_PHOTO_SLOTS && <Center …/>}` keeps the markup in place and
  leaves no element in the DOM (FR-1). The surrounding `HStack`/`Stack` gaps then close up on their
  own, with no spacing change needed.
- **Testing both values.** Each test file uses `vi.hoisted` to hold a mutable flag, and
  `vi.mock('@/shared/components/photo-slots')` exposes it through a getter. A test can then flip it
  per case, and the component reads it at render time. It's a build-time constant, not app logic, so
  this fits the "mock at the boundary" standard better than adding a test-only prop to two page
  components.
- **The cooking view's icon goes in front of `metaIcons.cookTime`** in the existing meta `HStack`,
  with the same size and stroke as `DinnerCard`'s meta row. It renders only when the constant is
  `false`, so the icon never appears twice.
- **PlanPage's slot is only in the `threeAcross` (md+) branch.** Its test needs `matchMedia` at
  desktop width. Check how `PlanPage.test.tsx` already gets three-across.

### Acceptance Criteria

- [ ] With the constant `false`, no `photo-slot` element on the catalog card, cooking view row or
      This week three-across card
- [ ] With it `true`, all three are present, sized as today
- [ ] The cooking view meta row has a cuisine icon only when the slots are off
- [ ] The catalog card's meta-row cuisine icon and name are unchanged in both states
- [ ] Expand and collapse in the cooking view work in both states
- [ ] `ux-guide.md` records the slots as off
- [ ] Lint, typecheck and the full test suite pass
- [ ] Catalog, cooking view and This week checked at 390px (same-origin iframe) and at desktop width
