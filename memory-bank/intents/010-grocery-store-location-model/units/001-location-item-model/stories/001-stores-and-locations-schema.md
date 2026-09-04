---
id: 001-stores-and-locations-schema
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 050-location-item-model
implemented: false
---

# Story: 001-stores-and-locations-schema

## User Story

**As a** developer building the walking-path model
**I want** household-scoped `stores` and `locations` tables
**So that** the schema is multi-store-ready now, with v1 showing exactly one Store per
household

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** `stores(id, household_id, name,
    is_active, created_at)` exists with a partial unique index
      `unique (household_id) where is_active` (at most one active Store per household).
- [ ] **Given** the same migration, **When** applied, **Then** `locations(id, household_id,
    store_id, name, type, position)` exists with `type in ('section','aisle')`,
      `unique (store_id, position)`, and `unique (id, store_id)` (enabling composite FKs from
      later stories). `store_id` FKs to `stores(id) on delete cascade`.
- [ ] **Given** both tables, **When** RLS is applied, **Then** it mirrors
      `20260828232000`'s shape exactly (member-select, member-insert/update/delete scoped to
      `current_user_household_id()`).
- [ ] **Given** a Location's `name`, **When** it has no parseable leading number, **Then** it
      is still valid — `type` alone drives display, never derived from `name` at the schema
      level.

## Technical Notes

- Mirror the RLS policy names/shape used for `grocery_store_rows` in `20260828232000` (four
  policies per table: select/insert/update/delete "in own household").
- `household_id` is denormalized onto `locations` (not only reachable via `store_id`) for RLS
  simplicity and consistency with this app's existing pattern (e.g. `meal_history`).

## Dependencies

### Requires

- None (first story of the unit)

### Enables

- 002-items-registry-and-sync-trigger
- 003-item-and-category-placements
- 006-reorder-location-rpc
- 007-cutover-migration

## Edge Cases

| Scenario                                        | Expected Behavior                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| Two households both create their first Store    | Each gets its own row; no cross-household uniqueness conflict        |
| A household tries to mark a second Store active | Partial unique index rejects it (v2 concern; v1 never attempts this) |

## Out of Scope

- Seeding an actual Store row for existing households (story 007, cutover)
- The reorder RPC (story 006)
