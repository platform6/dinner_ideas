---
stage: implement
bolt: 078-dense-row-layouts
created: '2026-09-18T14:39:12Z'
---

## Implementation Walkthrough: dense-row-layouts

### Summary

On a phone, a cooking step's controls now sit below its text box with remove at the opposite end
from the reorder arrows, and a Store setup row gives its aisle name the first line to itself with
the count, buttons and chevron on the second. From `md` up both rows keep today's arrangement.

### Structure Overview

Both rows became a `Stack` whose `direction` is responsive — column on a phone, row from `md` up —
with the existing children regrouped so nothing is duplicated. No breakpoint hook, no second markup
tree: CSS chooses the arrangement, so the tests see one structure and there is no flash on first
paint.

### Completed Work

- [x] `src/features/recipe-entry/components/CookingStepsEditor.tsx` - each step is a responsive
      stack: number and textarea together, then a control group. On a phone that group is a row
      with up/down at one end and remove at the other; at `md`+ it is the column it was. The three
      buttons move from the undefined `xs` size to `sm`.
- [x] `src/features/store-config/components/LocationRow.tsx` - the row is a responsive stack: chip,
      name and preview on the first line; count, three buttons and chevron on the second, aligned
      right on a phone. The name keeps its single line only from `md` up.

### Key Decisions

- **Separation by position, not colour** (FR-2): remove sits at the far end of the control row on a
  phone and last in the column at `md`+, so it reads the same to anyone.
- **The count and chevron travel with the buttons** on a phone, rather than being duplicated into
  the first line. That is what frees the whole first line for the name.
- **`noOfLines` on the aisle name is now responsive**: dropped on a phone so a long name wraps,
  kept at `md`+ where a wrap would change row heights (NFR-2).
- **Step buttons grow to 34px at `md`+ too**, the product owner's choice at the Stage 1 checkpoint,
  rather than giving the app's one-off `xs` size a definition.

### Deviations from Plan

None beyond the `md`+ step-button growth, which the plan raised and the product owner decided.

### Dependencies Added

None.

### Developer Notes

- `tsc -b`, `eslint src --max-warnings=0` and all 786 tests pass, unchanged — including the Store
  setup tests that cover expanding a row, renaming in place and moving a row, which is the
  behaviour most at risk from this re-flow.
- Not yet seen in a browser: Stage 3 checks both screens at phone width and 1018px, with a long
  aisle name and a rename in progress.
