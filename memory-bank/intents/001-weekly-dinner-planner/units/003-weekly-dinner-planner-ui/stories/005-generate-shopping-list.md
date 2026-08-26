---
id: 005-generate-shopping-list
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 005-generate-shopping-list

## User Story

**As a** wife with 3 dinners picked for the week
**I want** a single shopping list combining all 3 dinners' ingredients, grouped by category
**So that** I can shop efficiently without cross-referencing 3 separate recipes

## Acceptance Criteria

- [ ] **Given** a plan (locked or still-unlocked) with exactly 3 dinners selected, **When** I view the shopping list, **Then** it includes every ingredient from all 3 dinners
- [ ] **Given** the same ingredient (same name and compatible unit) appears in more than one dinner, **When** the list is generated, **Then** it appears once with quantities summed
- [ ] **Given** the same ingredient appears with incompatible/mismatched units, **When** the list is generated, **Then** both are shown as separate lines rather than silently combined incorrectly
- [ ] **Given** the generated list, **When** displayed, **Then** items are grouped under category headings (e.g. Produce, Dairy, Meat/Protein, Pantry)

## Technical Notes

- Pure client-side aggregation function, unit-tested per `coding-standards.md` ("logic that's genuinely risky to get wrong").
- Input: the 3 dinners' `dinner_ingredients` rows (already pre-scaled to 3 servings per `001-dinner-catalog`) — no further scaling math needed here.
- Merge key: normalized ingredient name + unit.

## Dependencies

### Requires
- 004-editable-until-locked
- 001-dinner-catalog-schema (ingredient data shape)

### Enables
- 006-copy-shopping-list-to-clipboard

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Ingredient name differs only by casing/whitespace ("Onion" vs "onion ") | Normalized before matching so they still merge |
| An ingredient category is missing/null | Falls into a catch-all "Other" group rather than being dropped |

## Out of Scope

- Clipboard copy formatting — see 006-copy-shopping-list-to-clipboard
