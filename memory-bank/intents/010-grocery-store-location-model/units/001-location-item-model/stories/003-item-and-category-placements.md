---
id: 003-item-and-category-placements
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 050-location-item-model
implemented: true
---

# Story: 003-item-and-category-placements

## User Story

**As a** developer building the placement layer
**I want** an explicit per-item placement table and an inherited per-category fallback table,
both impossible to point at another store's Location
**So that** placing an ingredient is a single write, and a mistaken cross-store reference is a
schema-level impossibility, not an application-level bug class

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** `item_placements(id,
  household_id, store_id, item_id, location_id)` exists with `unique (item_id,
  store_id)` and a composite FK `(location_id, store_id) → locations(id, store_id)`.
- [ ] **Given** the same migration, **When** applied, **Then** `category_placements(id,
  household_id, store_id, category, location_id)` exists with `unique (store_id,
  category)` and the same composite-FK shape.
- [ ] **Given** either table, **When** the referenced Location is deleted, **Then** the
      dependent placement row is deleted (`location_id → locations(id) on delete cascade`) —
      **not** nulled. Neither table's `location_id` column is ever null while the row exists.
- [ ] **Given** an attempt to insert an `item_placements` row whose `(location_id, store_id)`
      pair doesn't match a real `locations` row (i.e. the location belongs to a different
      store), **When** it runs, **Then** the composite FK rejects it.
- [ ] **Given** RLS, **When** applied to both tables, **Then** it mirrors `20260828232000`.

## Technical Notes

- `category` values are the same free-text set already used by `dinner_ingredients.category`
  — no new enum, no FK to a categories table (none exists).
- The composite FK requires `locations.id` + `store_id` to be jointly unique — supplied by
  story 001's `unique (id, store_id)`.

## Dependencies

### Requires

- 001-stores-and-locations-schema
- 002-items-registry-and-sync-trigger

### Enables

- 004-location-resolution-query
- 007-cutover-migration

## Edge Cases

| Scenario                                                                         | Expected Behavior                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Placing the same Item twice in one store                                         | `unique (item_id, store_id)` — the second write is an upsert (`on conflict do update`), not a duplicate row |
| Deleting a Location with both item- and category-level placements pointing at it | Both cascade; affected Items fall back further down the resolution chain (story 004)                        |
| An Item never explicitly placed                                                  | No `item_placements` row ever created for it — absence is the "not placed" state                            |

## Out of Scope

- The resolution query that reads these tables (story 004)
- The reorder RPC (story 006)
