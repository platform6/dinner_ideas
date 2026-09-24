---
id: 001-merged-line-finds-its-aisle
unit: 002-merged-line-aisle
intent: 023-shopping-list-consolidation
status: draft
priority: must
created: '2026-09-24T14:56:10Z'
assigned_bolt: 081-merged-line-aisle
implemented: false
---

# Story: 001-merged-line-finds-its-aisle

## User Story

**As a** household member who placed "chicken thighs, cubed" in Aisle 4
**I want** the merged chicken thighs line to still be in Aisle 4
**So that** merging doesn't undo setup I already did

## Acceptance Criteria

- [ ] A line's registry item is the item with exactly its plain name, if one exists
- [ ] Otherwise, it's the first source name that has an aisle set directly
- [ ] Otherwise, it's the first source name
- [ ] **Given** "chicken thighs, cubed" placed in Aisle 4 and no "chicken thighs" item, **Then** the merged line sorts into Aisle 4
- [ ] **Given** both items exist and only the prep-note variant is placed, **Then** the exact name wins (rule 1). This is on purpose, and the test says so
- [ ] A line that didn't merge resolves exactly as today

## Technical Notes

- `reorder.ts:50` looks up `nameKey(item.name)`. Resolve the item once when the list is built, and carry its key on the line
- "Set directly" means the item's own placement, not a category default. `ResolvedItem` already tells them apart
- Keep `nameKey` identical to `items.name_key`. `reorder.test.ts` checks that and must still pass

## Dependencies

- Unit `001-line-merging` (lines carry their source names)
