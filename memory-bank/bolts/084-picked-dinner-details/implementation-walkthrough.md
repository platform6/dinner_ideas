---
stage: implement
bolt: 084-picked-dinner-details
created: '2026-10-18T22:31:11Z'
---

## Implementation Walkthrough: picked-dinner-details

### Summary

The catalog card's ingredient and step lists became two shared components. This week renders them
under an expand button on every picked dinner, and the Cook tab renders the ingredient list above
its existing steps, from the same single request that now also returns ingredients.

### Structure Overview

- **Shared lists**: `IngredientList` and `StepList` live with the catalog in `features/dinners`.
  Each takes rows and fetches nothing.
- **This week**: a small `PickedDinnerDetails` component fetches a dinner's details, and is mounted
  only while the dinner is open. `PlanPage` holds the open state: a set of ids for phone rows and one
  flag for the desktop cards.
- **Cook tab**: the existing query is widened, and the expanded area gets two labelled sections.

### Completed Work

- [x] `src/features/dinners/components/IngredientList.tsx` - A dinner's ingredients, one per line with the category icon, or "No ingredients recorded."
- [x] `src/features/dinners/components/StepList.tsx` - A dinner's steps in order with step icons, or "No steps recorded."
- [x] `src/features/dinners/components/DinnerCard.tsx` - Details renders the two shared lists under its existing labels. Unused imports removed. Tags unchanged
- [x] `src/features/dinners/types.ts` - New `DinnerWithStepsAndIngredients` for the Cook tab
- [x] `src/features/dinners/api.ts` - `fetchDinnersWithStepsByIds` also selects `dinner_ingredients(*)` and returns the new type. It's still one request, and the Cook tab is its only caller
- [x] `src/features/cooking-view/components/CookingViewPage.tsx` - The expanded row shows "Ingredients" with the shared list, then "Steps" over the unchanged step rows and empty text
- [x] `src/features/weekly-plan/components/PickedDinnerDetails.tsx` - "Ingredients" then "Steps" for one dinner, with the catalog's spinner and error text, loaded through the catalog's cached query
- [x] `src/features/weekly-plan/components/PlanPage.tsx` - An expand button on every phone row and desktop card, in any week. Desktop opens and closes all cards together, and phone rows are independent. Both reset when the week changes
- [x] `src/features/cooking-view/components/CookingViewPage.test.tsx` - The fixture builder gains `dinner_ingredients: []` for the new type. No test changed

### Key Decisions

- **Reset in the week handlers, not an effect**: the previous and next buttons both go through one
  `changeWeek`, which clears the open state alongside the offset. Nothing is left over to show for
  a moment after a week change.
- **Expand beside remove, not a whole-row button**: the remove button can't sit inside another
  button, so both are separate 36px icon buttons. Expand is ghost and remove is outline, so they
  look different.
- **Phone name can wrap**: the name's box gets `minW={0}` and the button group doesn't shrink, so at
  390px a long name wraps rather than pushing the buttons off the row.
- **Cook steps keep their own rows**: only the ingredient list is shared with the Cook tab. Its
  larger boxed steps stay, as FR-4 requires.
- **A new type instead of widening `DinnerWithSteps`**: the name says what the Cook tab receives.
  `DinnerWithSteps` stays as the base.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- With `allExpanded`, all three desktop cards mount `PickedDinnerDetails` at once, so up to three
  detail requests go out in parallel. Any dinner already opened in the catalog comes from the cache.
- Checks: `tsc -b` and `eslint src --max-warnings=0` are clean. `vitest run` passes 856/856 before
  the new tests. Prettier flags only `types.ts`, for its CRLF line endings, which it already had.
