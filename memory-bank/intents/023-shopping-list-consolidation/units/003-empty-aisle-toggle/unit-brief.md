---
unit: 003-empty-aisle-toggle
intent: 023-shopping-list-consolidation
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: stories-defined
created: '2026-09-24T14:56:10Z'
updated: '2026-09-24T14:56:10Z'
---

# Unit Brief: Empty Aisle Toggle

## Purpose

Store setup's walking path shows the aisles the household uses, and keeps the rest one tap away.

## Scope

### In Scope

- Hiding aisles with no items and no category placement
- A "Show N empty aisles" toggle, not remembered between visits
- A newly added aisle staying visible
- Reorder landing correctly while empties are hidden

### Out of Scope

- Deleting aisles (already possible)
- The aisle sheet's list of aisles, which still lists every aisle
- The shopping list

## Notes

`StoreConfigPage.tsx:209` renders every stop, and `itemsByLocation` and `categoriesByLocation` already
show which ones are empty. `reorder_location(locationId, newPosition)` accepts any target, so moving
past hidden aisles only means choosing the right position. `LocationRow`'s "Nothing here yet" stays
for an empty aisle when it's shown.

## Stories

- `001-empty-aisles-tucked-away`: Empty aisles hidden behind a toggle (Should)
