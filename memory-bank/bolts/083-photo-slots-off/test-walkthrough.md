---
stage: test
bolt: 083-photo-slots-off
created: '2026-10-18T20:20:00Z'
---

## Test Report: photo-slots-off

### Summary

- **Tests**: 856/856 passed across 51 files (8 new)
- **Coverage**: not measured. The project sets no percentage target (coding-standards.md)

### Test Files

- [x] `src/features/dinners/components/DinnerCard.test.tsx` - the tile is absent when the flag is off and present when it's on. The meta-row cuisine name shows in both states
- [x] `src/features/cooking-view/components/CookingViewPage.test.tsx` - when the flag is off there is no thumb and each of the 3 rows has a meta-row cuisine icon. When it's on there are 3 thumbs and no meta icon. Expand works in both states
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` - at a 1280px viewport (three-across), no tile when the flag is off and one per card when it's on

Each file mocks `@/shared/components/photo-slots` with a getter over a `vi.hoisted` flag, so one
file covers both values.

### Acceptance Criteria Validation

- ✅ **Slots absent from the DOM when off**: all three surfaces
- ✅ **Restored when on**: all three surfaces
- ✅ **One definition, imported by all three**: `photo-slots.ts`. The tests mock that one module
- ✅ **Catalog meta-row cuisine unchanged**: both states
- ✅ **Cooking view icon never shown twice**: inline icon only when off, thumb only when on
- ✅ **Expand and collapse unaffected**: both states
- ✅ **ux-guide.md records the slots as off**: "Photo slots" section
- ✅ **Lint, typecheck, full suite**: `eslint .`, `tsc -b`, `vitest run` all clean
- ⏳ **Browser check at 390px and desktop**: deferred to the release smoke test (product owner,
  2026-10-18). The Claude in Chrome extension was not connected

### Issues Found

None in the code.

### Notes

jsdom has no layout, so spacing after a slot is removed (story 001's alignment criterion) is only
covered by the browser check.
