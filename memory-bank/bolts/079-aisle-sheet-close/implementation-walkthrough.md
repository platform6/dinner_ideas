---
stage: implement
bolt: 079-aisle-sheet-close
created: '2026-09-18T18:58:07Z'
---

## Implementation Walkthrough: aisle-sheet-close

### Summary

The aisle sheet now has a close button you can see, in a header row beside the item's name, and its
last action clears the bottom of the screen on a phone.

### Structure Overview

One file. The sheet's three header lines moved into a row with the new button on the right, and the
body's bottom padding became responsive with the device's safe-area inset added. Everything else —
the suggestions, the list of stops, "Take it off the path" — is untouched, and the new button calls
the `onClose` the drawer already routes Escape and the overlay tap through.

### Completed Work

- [x] `src/features/store-config/components/AssignSheet.tsx` - a labelled close `IconButton` at the
      top right of the sheet, `size="sm"` so 44px on a phone; the body's bottom padding is
      `calc(1.5rem + env(safe-area-inset-bottom))` on a phone and unchanged at md+

### Key Decisions

- **`IconButton`, not `DrawerCloseButton`**: Chakra's built-in renders a `CloseButton`, which this
  theme sizes at 16×16px. Retheming that component for one sheet would also change the dinner card
  and the shopping-list alert that use it.
- **The same `onClose`**, so the visible control, Escape and the overlay tap are one path, and
  focus return to the trigger keeps working without new code.
- **`env(safe-area-inset-bottom)` rather than a bigger fixed padding**: it is 0 on a desktop
  browser and on phones without an inset, so nobody gets dead space they do not need.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- `tsc -b`, `eslint src --max-warnings=0` and all 794 tests pass, unchanged — including
  `AssignSheet.test.tsx` and the Store setup and shopping-list suites that open this sheet.
- Not yet seen in a browser: Stage 3 measures the button and checks that "Take it off the path" is
  fully visible at 390×667 without scrolling the sheet.
