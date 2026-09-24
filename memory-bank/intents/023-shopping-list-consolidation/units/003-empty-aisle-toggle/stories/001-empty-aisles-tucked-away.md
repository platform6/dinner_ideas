---
id: 001-empty-aisles-tucked-away
unit: 003-empty-aisle-toggle
intent: 023-shopping-list-consolidation
status: draft
priority: should
created: '2026-09-24T14:56:10Z'
assigned_bolt: 082-empty-aisle-toggle
implemented: false
---

# Story: 001-empty-aisles-tucked-away

## User Story

**As a** household member setting up the store
**I want** aisles I never use out of the way, but not deleted
**So that** the walking path shows the store I actually shop in

## Acceptance Criteria

- [ ] An aisle with no items and no category placement is hidden by default
- [ ] An aisle holding only a category is shown
- [ ] "Show N empty aisles" at the end of the path reveals them in their normal position, and doesn't appear when N is 0
- [ ] The toggle starts hidden on each visit
- [ ] An aisle added during this visit stays visible while it's empty
- [ ] **Given** empty aisles are hidden, **When** "move earlier" is tapped on a visible aisle, **Then** it lands before the previous visible aisle, not swapped with a hidden one
- [ ] With the toggle on, rename, reorder and delete work as today
- [ ] The "Where do you find it" sheet still lists every aisle

## Technical Notes

- `StoreConfigPage.tsx:209` maps every stop, and `itemsByLocation` and `categoriesByLocation` show which are empty
- `reorder_location` accepts any target position, so no schema change is needed (NFR-1)
- Compute `isFirst` and `isLast` over the visible list
- Check the toggle at phone width. It's a tap target, so it needs to be 44px (intent 024)

## Dependencies

- None
