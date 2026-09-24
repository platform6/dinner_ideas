---
unit: 001-line-merging
intent: 023-shopping-list-consolidation
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: stories-defined
created: '2026-09-24T14:56:10Z'
updated: '2026-09-24T14:56:10Z'
---

# Unit Brief: Line Merging

## Purpose

One line per grocery on the shopping list, even when dinners spell it with different prep notes or
units.

## Scope

### In Scope

- The merge key: drops the text after the first comma and any whole-word prep words. The prep-word
  list is one editable constant
- One amount per unit on a line, in first-appearance order, with no conversion
- The plain label, and the raw source names each line was built from (unit 002 needs them)
- The clipboard text

### Out of Scope

- Which aisle a line sorts into, and the aisle sheet (unit 002)
- Plurals, fuzzy matching, unit conversion
- The cooking view and the dinner's own ingredients

## Notes

`aggregate.ts:19` keys on `name|unit`. The new key is the stripped name alone, with amounts grouped by
unit inside the line. `ShoppingListItem` changes shape (`quantity` + `unit` becomes a list of amounts,
plus the source names), so `format.ts` and the list row change with it. `similarity.ts` is the house
style for a tuned, precision-first constant.

## Stories

- `001-prep-notes-dont-split-a-line`: The merge key strips prep notes (Must)
- `002-one-amount-per-unit`: A merged line shows each unit's total side by side (Must)
- `003-plain-label`: A merged line is labelled without prep notes (Must)
