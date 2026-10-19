---
id: 001-shared-ingredient-and-step-lists
unit: 001-picked-dinner-details
intent: 026-ingredients-in-week-and-cook
status: complete
priority: should
created: '2026-10-18T22:15:19Z'
assigned_bolt: 084-picked-dinner-details
implemented: true
---

# Story: 001-shared-ingredient-and-step-lists

## User Story

**As a** household member
**I want** ingredients and steps to look the same wherever I see them
**So that** I don't have to relearn a dinner's details on each tab

## Acceptance Criteria

- [ ] `IngredientList` renders a dinner's ingredients as the catalog does today: a category icon, then `quantity unit name`, one per line, in the order given. With none, it says "No ingredients recorded."
- [ ] `StepList` renders steps as the catalog does today: a step icon, then the instruction, in the order given. With none, it says "No steps recorded."
- [ ] `DinnerCardDetails` renders both, and its output is unchanged. The existing `DinnerCard` tests pass without edits
- [ ] Each component has its own tests (lines, order, empty state)

## Technical Notes

- Take the markup out of `DinnerCard.tsx` as is. Each component takes the rows as a prop and
  doesn't fetch anything.
- The section labels ("Ingredients", "Steps") stay with each caller, so the Cook tab can label its
  own steps.

## Dependencies

- None
