---
intent: 026-ingredients-in-week-and-cook
phase: inception
status: units-defined
updated: '2026-10-18T22:15:19Z'
---

# Units: Ingredients on This Week and Cook

## Decomposition Principle

The shared ingredient list is what keeps the three surfaces consistent. Both This week and Cook
depend on it, and neither is much work on its own. Split up, the units would share one component
and one release. So this is one unit and one bolt, with the shared lists as its first story.

## Unit Summary

| Unit                        | Name                  | Requirements                 | Depends on | Cuttable |
| --------------------------- | --------------------- | ---------------------------- | ---------- | -------- |
| `001-picked-dinner-details` | Picked Dinner Details | FR-1, FR-2, FR-3, FR-4, FR-5 | none       | No       |

## Unit 001: Picked Dinner Details

**Owns**: the shared `IngredientList` and `StepList`, the This week expand (phone and desktop),
and the Cook tab's Ingredients section and query.

**Risk**: low to medium. Two things to watch:

- **This week's layouts**: the phone row has a remove button and now needs an expand button too,
  without crowding the name at 390px. In the desktop cards, one shared open state means three cards
  growing together.
- **Cook query**: adding `dinner_ingredients(*)` to the select changes the `DinnerWithSteps`
  shape the Cook tab reads. Check every caller of `fetchDinnersWithStepsByIds` before changing it.

## Requirement-to-Unit Mapping

- **FR-1**: a picked dinner on This week expands → `001-picked-dinner-details`
- **FR-2**: ingredients, then steps → `001-picked-dinner-details`
- **FR-3**: desktop opens together, phone opens singly → `001-picked-dinner-details`
- **FR-4**: Cook shows ingredients above steps → `001-picked-dinner-details`
- **FR-5**: one ingredient list everywhere → `001-picked-dinner-details`
- **NFRs** (no new requests on load, no schema change, accessible and tested) → `001-picked-dinner-details`
