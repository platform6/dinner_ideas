---
id: 003-ingredient-lines-editor
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: complete
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 059-recipe-draft-form
implemented: true
---

# Story: 003-ingredient-lines-editor

## User Story

**As a** household member adding a dinner
**I want** to list what it takes and say which part of the store each thing comes from
**So that** the dinner produces a correct shopping list the first time it is picked

## Acceptance Criteria

- [ ] **Given** the form, **When** ingredients are entered, **Then** each line captures quantity,
      unit, name and category.
- [ ] **Given** a quantity of zero or less, **When** entered, **Then** it is refused before
      submission — `check (quantity > 0)` is never reached with a bad value.
- [ ] **Given** the category field, **When** it renders, **Then** it offers exactly `Produce`,
      `Protein`, `Dairy`, `Grains`, `Pantry` — the column's CHECK set — as a choice, never as free
      text.
- [ ] **Given** a dinner with no ingredient lines, **When** save is attempted, **Then** it is
      refused: a dinner that contributes nothing to a shopping list is not a dinner.
- [ ] **Given** several lines, **When** one is removed, **Then** the others keep their contents
      exactly — no re-keying that silently shifts values between rows.
- [ ] **Given** the ingredient section, **When** it renders, **Then** it states that quantities are
      for **3 servings** (2 adults + 1 small child). That convention exists only as a column
      comment today, which is how it gets lost.

## Technical Notes

- The category set is already exported as `INGREDIENT_CATEGORIES` in
  `src/features/store-config/types.ts`. Reuse it; do not re-declare the five values.
- Units are free text in the schema. The seed uses `lb`, `cups`, `each`, `tbsp`, `tsp`, `cloves`,
  `packet`, `oz`. Suggesting them is worthwhile; constraining to them is not.
- Reordering ingredient lines has no persisted meaning — `dinner_ingredients` has no position
  column — so reordering is a convenience within the form only, and must not imply otherwise.

## Dependencies

### Requires

- 001-recipe-entry-route

### Enables

- 005-atomic-save

## Edge Cases

| Scenario                               | Expected Behavior                                              |
| -------------------------------------- | -------------------------------------------------------------- |
| The same ingredient entered twice      | Allowed; the shopping list already merges by name + unit       |
| A fractional quantity (0.5 lb)         | Accepted; the column is `numeric`, not integer                 |
| An ingredient name that already exists | Nothing special happens here — the trigger dedupes by name_key |

## Out of Scope

- Assigning a walking-path stop; that is `/store` (intent 013)
- Any write to `items`, `item_placements` or `category_placements`
