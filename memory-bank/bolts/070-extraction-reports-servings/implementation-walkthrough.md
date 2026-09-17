---
stage: implement
bolt: 070-extraction-reports-servings
created: '2026-09-11T17:50:41Z'
---

## Implementation Walkthrough: 002-scale-on-review (extraction reports, code scales)

### Summary

The extraction no longer does arithmetic. It copies quantities exactly as the page wrote them and
reports the page's yield verbatim. A new pure module holds the only scaling logic in the app. The
review screen now says what an import's quantities are for, so bolt 070 is honest if shipped before
bolt 071 puts the control beside it.

### Structure Overview

Three layers. First, the prompt and parser report what the page says and nothing more. Second,
`scale.ts` is pure functions with no React and no I/O: reading a yield, and rounding and scaling a
draft. Third, a small copy module turns an import's yield into the sentence the editor shows. The
page holds the yield in state beside the draft, not on it.

### Completed Work

- [x] `src/features/recipe-entry/scale.ts`: `readYield` (single / range / unknown),
      `roundForKitchen` (the written rounding rule), `scaleDraft` (non-destructive, exact at identity)
- [x] `src/features/recipe-entry/import/prompt.ts`: rescaling rule removed; "copy exactly" and
      "report the yield verbatim" added; `servingsStated` became `yield`; no household-size argument
- [x] `src/features/recipe-entry/import/parse.ts`: `acceptYield`, lenient, verbatim;
      `ParseResult` carries `sourceYield`
- [x] `src/features/recipe-entry/import/extract.ts`: no household-size argument; the outcome
      carries `sourceYield`
- [x] `src/features/recipe-entry/components/import-quantity-note.ts`: what the editor says about
      an import's quantities, in its own module so the component file exports only components
- [x] `src/features/recipe-entry/components/IngredientLinesEditor.tsx`: `importSource` replaces
      the `quantitiesUnscaled` boolean
- [x] `src/features/recipe-entry/components/RecipeEntryPage.tsx`: holds `importSource`; extraction
      no longer receives the household size

### Key Decisions

- **The model no longer receives the household's serving size at all.** `buildSystemPrompt` and
  `extractRecipe` each lost an argument. Bolt 069 had added it knowing this bolt would take it away,
  so 069 would be correct if shipped alone. The model has no use for the number once it does no
  arithmetic. That removed argument is the boundary move itself.
- **The yield is lenient; ingredients stay strict.** A malformed yield costs the scale control a
  base and nothing else, and it is never saved (ADR-14). A malformed ingredient silently corrupts a
  shopping list. The asymmetry is deliberate and the same as tags versus ingredients.
- **`readYield` is conservative.** "Makes 24 cookies" is a count of pieces, not people, so it reads
  as `unknown`, not 24. When in doubt it is unknown, because a wrong base produces wrong quantities
  that look right.
- **A range is reported, never collapsed** (Checkpoint 2). `readYield("8–10")` returns
  `{ kind: 'range', low: 8, high: 10 }`, and deciding what to scale from is the user's job in
  bolt 071.
- **Identity scaling does not round.** `scaleDraft(d, 4, 4)` returns the quantities untouched.
  Otherwise a scale that changed nothing would quietly turn "0.33" into "0.375".
- **Units are not converted.** 0.375 cup stays cups. Converting is a judgment about a single
  ingredient, and not something arithmetic should decide.
- **The note has a "matches your household" case.** If a page serves 5 and the household cooks for
  5, the sentence "NOT adjusted to 5" about quantities already for 5 is true and misleading.

### Deviations from Plan

- **The worked example's yield is "3", not the plan's "4".** The example is a real founding dinner,
  written for 3. "4" would have invented a fact about real data.
- **Ingredient quantity ranges ("2-3 cloves") take the lower number.** The plan did not cover this.
  `quantity` must be a single positive number (bolt 061's parser), so a range has to become one, and
  the prompt now says which. This is a choice of number, not arithmetic on one, so it does not
  reintroduce what the bolt removed.
- **`importQuantityNote` moved to its own module** after ESLint's react-refresh rule flagged it in
  the component file.

### Dependencies Added

None.

### Developer Notes

- **Nothing calls `scaleDraft` yet.** That is correct for this bolt (FR-4: nothing scales unasked),
  and it becomes bolt 071's control.
- **Every import now shows a note.** Before this bolt the caveat appeared only when the page stated
  no count. Now every import is "as written", so the note always applies. It only changes what it
  says the numbers are for.
- **Local dev against production:** until migration `20260911173308` reaches production, a local
  frontend pointed at it gets an error reading `servings_per_dinner`. The entry form falls back to 3,
  and the Settings "Recipes" card shows its load error. That is ADR-9 in action, not a defect.
