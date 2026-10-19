---
unit: 001-picked-dinner-details
intent: 026-ingredients-in-week-and-cook
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-10-18T22:15:19Z'
updated: '2026-10-18T22:15:19Z'
---

# Unit Brief: Picked Dinner Details

## Purpose

A picked dinner's ingredients, and on This week its steps too, can be seen where the household
plans and cooks, not only in the catalog.

## Scope

### In Scope

- `IngredientList` and `StepList`, taken out of `DinnerCardDetails` without changing how the
  catalog renders
- This week: an expand button on each picked dinner (phone rows and desktop cards, any week)
  showing ingredients, then steps, with loading, error and empty states
- Desktop: one open state for all three cards. Phone: per-row open state
- Cook tab: `dinner_ingredients(*)` in `fetchDinnersWithStepsByIds`, and an Ingredients section
  above the existing steps

### Out of Scope

- Tags on This week or Cook, and any editing
- The shopping list
- Cooking mode improvements (still in `tasks.md`)
- The Cook tab's step styling and its "No steps available for this dinner yet." text

## Notes

- `DinnerCard.tsx` `DinnerCardDetails`: the Ingredients block (`categoryIcon`, then
  `quantity unit name`, in an `UnorderedList`) and the Steps block (`stepIcon`, in an
  `OrderedList`). These become the shared components.
- `PlanPage.tsx`: the phone row is an `HStack` (badge, name and meta, then the remove button).
  The desktop card is a `Stack` (badge and remove row, then name and meta). Both are built from
  the same `badge`, `name`, `meta` and `removeButton` pieces.
- `CookingViewPage.tsx`: the expand is a `Box as="button"` with `aria-expanded`. The steps
  render under `isExpanded`.
- `useDinnerFullDetails` and `fetchDinnersWithStepsByIds` are in `src/features/dinners/`.
- Desktop tests use the 1280px `matchMedia` stub that `PlanPage.test.tsx` already has
  (intent 025).

## Stories

- `001-shared-ingredient-and-step-lists`: the catalog's lists become shared components (Should)
- `002-this-week-expands`: a picked dinner on This week opens to its ingredients and steps (Must)
- `003-cook-shows-ingredients`: a Cook tab row opens to ingredients above its steps (Must)
