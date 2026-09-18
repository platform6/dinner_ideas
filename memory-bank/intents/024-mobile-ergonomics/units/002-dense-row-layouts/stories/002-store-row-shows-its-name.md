---
id: 002-store-row-shows-its-name
unit: 002-dense-row-layouts
intent: 024-mobile-ergonomics
status: planned
priority: must
created: '2026-09-18T13:10:36Z'
assigned_bolt: null
implemented: false
---

# Story: 002-store-row-shows-its-name

## User Story

**As a** household member setting up the walking path on a phone
**I want** to read the whole aisle name
**So that** I can tell which aisle a row is before I move it

## Acceptance Criteria

- [ ] **Given** a phone, **Then** the aisle name is not cut short to make room for the buttons
- [ ] The item preview keeps its single line
- [ ] Move earlier, move later, rename and expand stay reachable, each at least 44×44px
- [ ] Tapping the row still expands it; tapping a button still does not
- [ ] Renaming in place still works, including its input and its save
- [ ] At md+ the row is unchanged

## Technical Notes

- `LocationRow.tsx:96-171`: one `HStack` holding the handle column, type chip, name and preview (`noOfLines={1}`), a count, and four icon buttons, with `onClick` on the row and `stopPropagation` on the button group
- The actions moving to their own line on a phone is the Checkpoint 1 decision

## Dependencies

- Unit `001-touch-target-size`
