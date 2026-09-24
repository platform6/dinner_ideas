---
id: 002-one-amount-per-unit
unit: 001-line-merging
intent: 023-shopping-list-consolidation
status: complete
priority: must
created: '2026-09-24T14:56:10Z'
assigned_bolt: 080-line-merging
implemented: true
---

# Story: 002-one-amount-per-unit

## User Story

**As a** household member shopping
**I want** a merged line to show each unit's total, side by side
**So that** I see everything I need on one line, without the app guessing a conversion

## Acceptance Criteria

- [ ] 1 lb + 1 lb → "2 lb chicken thighs"
- [ ] 2 lb + 4 (no unit) → "2 lb + 4 chicken thighs"
- [ ] 1 tbsp + 2 tsp → "1 tbsp + 2 tsp", with no conversion
- [ ] 4.5 cups + 4.5 cup → "9 cups": a unit's singular and plural are one unit (added in bolt 080)
- [ ] Amounts appear in the order each unit first appears
- [ ] **Given** the same dinners in shuffled order, **Then** the list is identical: lines, labels and amount order (NFR-3)
- [ ] Copy to clipboard produces the same amounts text as the screen

## Technical Notes

- `ShoppingListItem` goes from `quantity` + `unit` to a list of `{ unit, quantity }`
- `format.ts` builds `- {quantity} {unit} {name}` today. Share one amounts formatter between the row and the clipboard
- "First appearance" needs a stable dinner order. Sort the dinners by id before merging, so NFR-3 holds whatever order the query returns

## Dependencies

- `001-prep-notes-dont-split-a-line`
