---
stage: plan
bolt: 071-scale-control
created: '2026-09-11T17:58:06Z'
---

## Implementation Plan: 002-scale-on-review (the control)

### Objective

Put `scaleDraft` (bolt 070) in the user's hands on the review screen: offered, never applied
uninvited, naming both numbers, and undoable. Story 003. This closes unit 002.

---

## What each kind of yield offers

`readYield` (bolt 070) already sorts every yield into one of three kinds. The control's behaviour
follows from the kind, and each row corresponds to an acceptance criterion:

| The page said        | `readYield`    | The review offers                                                                                                                                                                        |
| -------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"4"`, household 5   | single 4       | **"Scale from 4 to 5"**, both numbers named                                                                                                                                              |
| `"5"`, household 5   | single 5       | nothing, because the note already says it matches                                                                                                                                        |
| `"8–10"`             | range 8–10     | **a box for the base** ("Scale to 5 from: [ ]"), with the page's range beside it. **Not pre-filled**, because a pre-filled number is the app picking one out of the range (Checkpoint 2) |
| `"Makes 24 cookies"` | unknown        | no control, and the note says why: _that yield isn't a number of people_                                                                                                                 |
| nothing              | unknown (null) | no control, and the existing note already says the page gave no count                                                                                                                    |
| typed in by hand     | (no import)    | nothing at all                                                                                                                                                                           |

---

## Undo, and what counts as the user's own numbers

FR-3: _"it can be undone without re-importing."_ The question is what undo does after the user has
edited something.

- **Undo restores the ingredients exactly as they were before scaling.** The page keeps that
  snapshot when the user scales. `scaleDraft` is non-destructive, so the snapshot is simply the
  previous array.
- **Undo is offered until the user edits an ingredient line.** After that the scaled numbers are
  the user's own, and restoring the snapshot would silently throw their edit away. Undo disappears,
  and the control does not reappear, so there is no way to scale twice on top of hand edits.
- Edits to the name, steps or tags do **not** end undo, because they are not what undo restores.
- Scaling once is the whole feature. After scaling, the only action offered is Undo. Re-scaling
  would compound rounding: 4 → 5 → 3 rounds twice. It can happen only through Undo followed by a
  fresh scale, which always starts from the page's own numbers.

---

## Where it lives

- **A new `ScaleControl` component**, rendered by `IngredientLinesEditor` in place of the plain
  import note. It shows the note and the control together, where the user reads the quantities
  (story 003's technical note).
- The editor stays presentational. **The page** owns the state (`scaling`: the snapshot, and from
  and to) and calls `scaleDraft`. The editor and control only report "scale from N" and "undo".
- After scaling, the note says what happened: _"Scaled from 4 to 5 — rounded to what a kitchen can
  measure."_, followed by **Undo**.

---

## What must NOT happen

- **Nothing scales on arrival** (FR-4). A test asserts the page's quantities are on the form
  untouched until the control is pressed. That is the regression bolt 071's brief warns about.
- **No base guessed from a range.** The box starts empty.
- **Nothing reaches the save path.** Saving sends whatever the form holds, scaled or not, and
  `createDinner` is unchanged.

## Acceptance Criteria

- [ ] A single yield offers "Scale from {yield} to {N}"; pressing it scales every quantity visibly
- [ ] Undo restores the page's quantities without re-importing
- [ ] A range asks for the base, with no pre-filled value, and scales from what the user enters
- [ ] An unknown yield (pieces, prose) offers no control, and says why
- [ ] No yield offers no control; the existing note explains
- [ ] A yield equal to N offers no control
- [ ] Quantities are untouched until the user acts, and saving without scaling saves the page's
- [ ] Saving after scaling saves the scaled quantities
- [ ] Editing an ingredient after scaling ends undo, and never re-offers scaling
- [ ] `tsc -b`, `eslint`, `vitest` green
