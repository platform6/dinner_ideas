---
id: 006-reorder-location-rpc
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 050-location-item-model
implemented: true
---

# Story: 006-reorder-location-rpc

## User Story

**As a** household member reordering the walking path
**I want** a race-safe reorder that works across the whole path, not per-type
**So that** sections and aisles move as one sequence with no position collisions

## Acceptance Criteria

- [ ] **Given** `reorder_location(p_location_id uuid, p_new_position integer)`, **When**
      called, **Then** it uses the same shift-and-renumber algorithm as
      `reorder_grocery_store_row` (`FOR UPDATE`, shift the intermediate range, move the
      target into place), scoped to the target Location's `store_id` — only that store's
      rows shift.
- [ ] **Given** a reorder, **When** it completes, **Then** `(store_id, position)` stays unique
      for every row in that store.
- [ ] **Given** a path with both `section` and `aisle` Locations, **When** any one is
      reordered, **Then** it moves within the single interleaved sequence — no per-type
      sub-ordering exists.
- [ ] **Given** a position outside the valid range for that store, **When** requested,
      **Then** the RPC raises, matching the existing function's error behavior.

## Technical Notes

- Direct generalization of `reorder_grocery_store_row` (`20260827040000`,
  household-scoped by `20260828231000`) — add one more scoping predicate (`store_id`), same
  shift logic otherwise.

## Dependencies

### Requires

- 001-stores-and-locations-schema

### Enables

- (Unit 2) FR-11 walking-path reorder arrows

## Edge Cases

| Scenario                                         | Expected Behavior                                                |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Concurrent reorders in the same store            | `FOR UPDATE` serializes them, same as today's RPC                |
| Reordering in a store with only one Location     | No-op; returns the single row unchanged                          |
| A `p_new_position` equal to the current position | No-op, returns the set unchanged (matches existing RPC behavior) |

## Out of Scope

- Drag-and-drop (v2; `position` already supports it with no schema change)
