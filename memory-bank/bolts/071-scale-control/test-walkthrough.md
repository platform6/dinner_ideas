---
stage: test
bolt: 071-scale-control
created: '2026-09-11T18:05:45Z'
---

## Test Report: 002-scale-on-review (the control)

### Summary

- **Tests**: **707/707** project-wide, **+10** in this bolt
- **Gates**: `tsc -b` ✅ · `eslint .` ✅ (0 errors; the pre-existing Edge Function warning) ·
  `prettier` ✅
- **Coverage**: no coverage tooling in this project; counts reported instead
- **Live check**: not run. The browser extension was not connected (see bolt 070's report). The
  control is pure UI over bolt 070's tested arithmetic, so a live run would add evidence about the
  model's yield, not about this control

### Test Files

- [x] `src/features/recipe-entry/components/RecipeEntryPage.test.tsx` (70, **+10**): a new
      `scaling on review` block, driven through the real page as a user would drive it

### Acceptance Criteria Validation (story 003)

- ✅ **A single yield names both numbers**: "Scale from 4 to 5"
- ✅ **Applying changes the quantities visibly**: 0.75 becomes 1 (0.9375 rounded to the nearest ⅛),
  and the note says "Scaled from 4 to 5"
- ✅ **Undoable without re-importing**: undo restores 0.75, and the model was called once in total
- ✅ **A range asks for the base**: the box starts **empty**, the button is disabled until a base is
  entered, and no "Scale from N" is offered. Entering 8 gives 0.5
- ✅ **No count means nothing offered**, and the existing note explains
- ✅ **Pieces or prose mean nothing offered**, and the control says "isn't a number of people"
- ✅ **A yield equal to the household means nothing offered**
- ✅ **Saving without touching the control saves the page's quantities** (0.75 reaches
  `createDinner`)
- ✅ **Saving after scaling saves the scaled quantities** (1 reaches `createDinner`)
- ✅ **Editing after scaling ends undo** and never re-offers scaling ("they're yours now")

### The guards were checked by breaking the code

1. **Auto-scale on arrival**, _"because the household size is right there"_, which is the exact
   regression bolt 071's brief warns about. Five tests failed, led by the dedicated FR-4 test (`lands
the page quantities UNCHANGED`). The guard is not a single assertion that someone could loosen.
2. **Undo surviving an ingredient edit.** Exactly one test failed, `ends undo once the user edits a
quantity`.

Both were restored and the full suite re-run green.

### Issues Found

None.

### Notes

- **Unit 002 is complete with this bolt.** The boundary move intent 018 was created for is done
  end to end: the model reports, `scale.ts` computes, and the user decides.
- **Outstanding from bolt 070, not this bolt:** one live import of the bark page to confirm the model
  reports "8–10" verbatim and leaves the butter at 1 cup. The control is only as good as the yield
  it is given.
