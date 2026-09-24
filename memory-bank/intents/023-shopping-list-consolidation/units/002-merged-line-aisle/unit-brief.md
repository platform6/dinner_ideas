---
unit: 002-merged-line-aisle
intent: 023-shopping-list-consolidation
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: stories-defined
created: '2026-09-24T14:56:10Z'
updated: '2026-09-24T14:56:10Z'
---

# Unit Brief: Merged Line Aisle

## Purpose

Merging lines never loses an aisle the household already chose.

## Scope

### In Scope

- Choosing a line's registry item: the item with the exact plain name, else the first source name
  that has an aisle set directly, else the first source name (FR-4)
- Sorting by that item's position (`reorder.ts`)
- Opening the aisle sheet for that item, and re-sorting after a move
- A key for check marks that survives both the merge and a move

### Out of Scope

- The merge itself (unit 001)
- Merging items in Store setup's list of groceries (that needs `name_key` to change, which NFR-1 rules out)

## Notes

Today `reorder.ts:50` and `ShoppingListPage.tsx` (`itemByNameKey`) both look a line up by
`nameKey(line.name)`, and that's what breaks. Resolve the item once, when the list is built, and pass
it to both, instead of teaching the same rules to two places.

## Stories

- `001-merged-line-finds-its-aisle`: The line sorts into the aisle its sources were placed in (Must)
- `002-sheet-and-checks-follow-the-line`: The aisle sheet and the check mark work on a merged line (Must)
