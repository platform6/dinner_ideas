---
id: 007-cutover-migration
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 051-location-item-model
implemented: true
---

# Story: 007-cutover-migration

## User Story

**As a** household who already configured Rows + Category Assignments
**I want** my existing setup carried across automatically
**So that** the new model works for me on day one, with an equivalent walking order and
shopping-list sort, and none of my configuration is thrown away

## Acceptance Criteria

- [ ] **Given** every existing household, **When** the cutover runs, **Then** exactly one
      `stores` row is seeded (`is_active = true`).
- [ ] **Given** every existing `grocery_store_rows` row, **When** migrated, **Then** it
      becomes a `locations` row under that household's seeded store: `name` and `position`
      preserved, `type` inferred (`Aisle \d+` pattern → `aisle`, else `section`; ambiguous
      defaults to `section` and is user-editable afterward). `grocery_store_rows` was already
      `unique(household_id, position)`, so the migrated `locations` rows land at the same
      `(store_id, position)` values with no collision.
- [ ] **Given** every existing `category_row_assignments` row, **When** migrated, **Then** it
      becomes a `category_placements` row (`category`, `location_id`) for that same store.
- [ ] **Given** every existing household, **When** the cutover runs, **Then** `items` is
      backfilled with one row per distinct existing `dinner_ingredients.name` for that
      household (reusing story 002's `on conflict (household_id, name_key) do nothing`).
- [ ] **Given** the backfill, **When** it completes, **Then** **zero** `item_placements` rows
      are created — every Item inherits its category's placement on day one.
- [ ] **Given** the old tables, **When** their data is fully carried across, **Then**
      `grocery_store_rows` and `category_row_assignments` are dropped (same migration or a
      documented follow-up) — forward-only, no edits to prior migration files.
- [ ] **Given** a household that had configured rows + assignments, **When** the cutover
      completes, **Then** the resolution query (story 004) returns an equivalent walking
      order and equivalent resolved locations to what the old model produced for the same
      data — no regression.

## Technical Notes

- One append-only migration file (or two — a schema migration and a data-cutover migration,
  as `004-account-model` did for its founding-household backfill).
- `type` inference regex + default is a one-time heuristic; the result is fully
  user-editable afterward (story 002/unit 2's rename flow), so a wrong guess is not
  destructive.

## Dependencies

### Requires

- 001-stores-and-locations-schema
- 002-items-registry-and-sync-trigger
- 003-item-and-category-placements

### Enables

- (Unit 2, unit 3) everything — this is the last story before the old tables are gone

## Edge Cases

| Scenario                                                                         | Expected Behavior                                                                                  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A household with no `grocery_store_rows` at all                                  | Still gets a seeded (empty) Store; the store-config page shows the first-run state (unit 2, FR-14) |
| A `dinner_ingredients` name that doesn't match any current recipe (orphaned)     | Still backfilled into `items` if it was ever referenced; harmless                                  |
| Two `grocery_store_rows` rows somehow share a name after retyping as `locations` | No uniqueness conflict — Locations are keyed by `(store_id, position)`, not name                   |

## Out of Scope

- Any UI for reviewing the migrated data before it lands (this is a database migration, run
  once at deploy, like every prior cutover in this project)
