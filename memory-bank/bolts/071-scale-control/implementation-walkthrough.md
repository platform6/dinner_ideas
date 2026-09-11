---
stage: implement
bolt: 071-scale-control
created: '2026-09-11T18:00:29Z'
---

## Implementation Walkthrough: 002-scale-on-review (the control)

### Summary

The review screen now offers to scale an imported recipe to the household's size. It names both
numbers, asks for a base when the page gave a range, and explains when there is nothing to scale
from. Scaling is undoable until the user edits a quantity. Nothing is scaled unless the user asks.

### Structure Overview

A new `ScaleControl` component takes the place of the plain import note inside
`IngredientLinesEditor`. It shows the note and the choice together. The page owns the scaling state
(the before-snapshot, and from and to) and calls bolt 070's pure `scaleDraft`. The control and the
editor only report intentions. The `readYield` kind decides what is offered.

### Completed Work

- [x] `src/features/recipe-entry/components/ScaleControl.tsx`: the note plus the control. A
      single yield gets "Scale from X to N". A range gets an empty base box. Pieces or prose get an
      explanation. After scaling it shows "Scaled from X to N" with Undo
- [x] `src/features/recipe-entry/components/IngredientLinesEditor.tsx`: renders `ScaleControl`
      for imports and passes `scaled`, `onScale` and `onUndoScale` through
- [x] `src/features/recipe-entry/components/RecipeEntryPage.tsx`: `scaling` state; `handleScale`,
      `handleUndoScale`, and `endUndoAfterEdit` on every ingredient edit or added line; scaling is reset
      on a new import

### Key Decisions

- **Undo ends at the user's first ingredient edit.** After that the scaled numbers are the user's
  own, and restoring the snapshot would silently discard what they typed. Edits to the name, steps
  and tags do not end undo, because undo does not touch them.
- **Scaling happens once.** After scaling, only Undo is offered. Rescaling on top of rounded
  numbers compounds the rounding: 4 → 5 → 3 rounds twice. Undo and then scaling again always
  starts from the page's own numbers.
- **The range box starts empty.** Pre-filling it with 8 or 9 would be the app choosing a number out
  of "8–10", which Checkpoint 2 left to the user.
- **The handlers live on the page, not in the control.** The page already owns the draft, and
  keeping the snapshot beside it means undo cannot drift from what was actually scaled.
- **`scaleDraft`'s input is the snapshot.** It is non-destructive (bolt 070), so the current
  ingredients array can be kept as-is for undo without copying.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- `onScale` and `onUndoScale` default to no-ops on the editor, so any caller that never imports
  (and there is none today) needs no scaling wiring.
- The control's button labels are the test handles: "Scale from 4 to 5", "Scale to 5", and "Undo —
  use the page's quantities". Changing the copy means changing the tests, on purpose.
