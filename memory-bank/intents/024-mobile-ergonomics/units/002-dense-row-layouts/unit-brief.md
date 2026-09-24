---
unit: 002-dense-row-layouts
intent: 024-mobile-ergonomics
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-09-18T13:10:36Z'
updated: '2026-09-18T13:10:36Z'
---

# Unit Brief: Dense Row Layouts

## Purpose

Two rows stop crowding what matters: the step editor and the Store setup walking path.

## Scope

### In Scope

- The cooking-step row: remove leaves the reorder pair, and all three reach 44px
- The Store setup row on a phone: name and preview first, actions on their own line
- Keeping the row-tap-to-expand behaviour, and the buttons not triggering it

### Out of Scope

- Anything about what the rows contain
- The desktop layout of either row
- Confirmation before removing a step (ruled out at Checkpoint 1)

## Notes

`CookingStepsEditor.tsx:88-107` puts remove between two reorder arrows, all `size="xs"`, which has no theme entry and falls back to 24px. `LocationRow.tsx:96-171` is one `HStack`: a drag-handle column, a type chip, the name and preview (`noOfLines={1}`), a count, and four icon buttons — and an `onClick` on the row itself that the buttons stop from firing.

## Stories

- `001-remove-step-is-not-a-mis-tap`: Remove leaves the arrows and reaches 44px (Must)
- `002-store-row-shows-its-name`: The aisle name gets the row on a phone (Must)
