---
id: 003-cook-shows-ingredients
unit: 001-picked-dinner-details
intent: 026-ingredients-in-week-and-cook
status: complete
priority: must
created: '2026-10-18T22:15:19Z'
assigned_bolt: 084-picked-dinner-details
implemented: true
---

# Story: 003-cook-shows-ingredients

## User Story

**As a** household member cooking
**I want** an open Cook tab row to list the ingredients before the steps
**So that** I can gather everything before I start

## Acceptance Criteria

- [ ] `fetchDinnersWithStepsByIds` selects `dinner_ingredients(*)` as well, and the type that the Cook tab reads includes them. It's still one request
- [ ] An expanded row shows "Ingredients" with `IngredientList`, then a "Steps" label above the existing steps
- [ ] The steps keep their current Cook styling, and "No steps available for this dinner yet." is unchanged
- [ ] A dinner with no ingredients shows "No ingredients recorded."
- [ ] Collapsed rows, the meta line (including intent 025's cuisine icon) and the several-open behaviour are unchanged

## Technical Notes

- Check every caller of `fetchDinnersWithStepsByIds` and `DinnerWithSteps` before widening them.
  A new `DinnerWithStepsAndIngredients` type is fine if anything else depends on the old shape.

## Dependencies

- `001-shared-ingredient-and-step-lists`
