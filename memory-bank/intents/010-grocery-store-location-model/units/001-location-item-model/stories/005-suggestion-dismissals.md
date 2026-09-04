---
id: 005-suggestion-dismissals
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 050-location-item-model
implemented: true
---

# Story: 005-suggestion-dismissals

## User Story

**As a** household member who rejected a similarity suggestion
**I want** that exact pairing to stop being suggested
**So that** a known-wrong suggestion doesn't keep costing me a dismiss tap forever

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** `suggestion_dismissals(id,
  household_id, store_id, item_id, suggested_item_id)` exists with
      `unique (store_id, item_id, suggested_item_id)`.
- [ ] **Given** RLS, **When** applied, **Then** it mirrors `20260828232000`.
- [ ] **Given** a dismissal is recorded, **When** the same `(item_id, suggested_item_id)`
      pairing would otherwise be suggested again in that store, **Then** it is excluded
      (consumed by unit 2's FR-7 query, not this story, but the table's shape must make that
      exclusion a simple anti-join).

## Technical Notes

- Small, standalone table — no trigger, no cascade complexity beyond the ordinary
  `on delete cascade` to `items(id)` for both `item_id` and `suggested_item_id`.

## Dependencies

### Requires

- 002-items-registry-and-sync-trigger

### Enables

- (Unit 2) FR-7 similarity algorithm's exclusion filter

## Edge Cases

| Scenario                                            | Expected Behavior                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| Dismissing the same pairing twice                   | `unique` constraint — second attempt is a no-op (`on conflict do nothing`) |
| Either item in a dismissed pairing is later deleted | Cascades away; nothing to suppress for a pairing that can no longer occur  |

## Out of Scope

- The similarity scoring itself (unit 2, story 001)
