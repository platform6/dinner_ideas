---
unit: 004-grocery-store-config
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-27T01:00:00Z'
updated: '2026-09-04T21:05:00Z'
superseded_by: '010-grocery-store-location-model'
---

# Unit Brief: Grocery Store Config

> **⚠️ SUPERSEDED BY INTENT `010-grocery-store-location-model` (2026-09-04).**
>
> This unit's model — `grocery_store_rows` + `category_row_assignments`, mapping a whole
> ingredient _category_ to a row — is replaced by the Store → Location → Item model, which
> places **individual ingredients** at Locations with category placement surviving as an
> automatic fallback. The data was carried across by bolt `051` (migration
> `20260904190000_location_item_model_cutover.sql`) with a verified-equivalent walking order.
>
> The old tables still exist but are retired-in-waiting: see
> `bolts/051-location-item-model/deferred-retirement-migration.sql` and decision-index **ADR-9**.
> Read this brief for history only — nothing here describes the current model.

## Purpose

Owns the grocery-store-layout domain: lets the wife define her store as an ordered list of named "rows" (aisle sections), assign each existing ingredient category to a row, and reorders the shopping list's category groups to match — so the list reads in the order she actually walks the store.

## Scope

### In Scope

- `grocery_store_rows` schema: name + position (sequence order)
- Category → row assignment (each ingredient `category` string maps to exactly one row)
- RLS policies for the shared household session
- Pure reorder function: given the shopping list's category groups and the current row config, return groups sorted by row position; categories with no assigned row fall back to appearing after all configured rows, alphabetically (today's current behavior)

### Out of Scope

- Dinner/ingredient schema, including the `category` field itself → `001-dinner-catalog`
- Shopping list aggregation/merge logic (`buildShoppingList`) → stays in `003-weekly-dinner-planner-ui`, this unit only supplies the sort order
- Any UI (the config page, row add/reorder controls) → `003-weekly-dinner-planner-ui`

---

## Assigned Requirements

| FR    | Requirement                                              | Priority |
| ----- | -------------------------------------------------------- | -------- |
| FR-12 | Grocery store row configuration (schema + reorder logic) | Must     |
| FR-15 | Default grocery store rows & category assignments (seed) | Must     |

---

## Domain Concepts

### Key Entities

| Entity                | Description                                              | Attributes              |
| --------------------- | -------------------------------------------------------- | ----------------------- |
| GroceryStoreRow       | One named section of the user's store, in shopping order | id, name, position      |
| CategoryRowAssignment | Maps one ingredient category to one row                  | category (text), row_id |

### Key Operations

| Operation                 | Description                                                                                                        | Inputs                          | Outputs                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------- |
| List rows (ordered)       | Return all configured rows in position order                                                                       | (none)                          | GroceryStoreRow[]               |
| Add row                   | Create a new named row at a given position                                                                         | name, position                  | GroceryStoreRow                 |
| Reorder rows              | Move a row to a new position, renumbering the rest                                                                 | row_id, new position            | GroceryStoreRow[]               |
| Assign category to row    | Set which row an ingredient category belongs to                                                                    | category, row_id                | CategoryRowAssignment           |
| Sort shopping-list groups | Given aggregated category groups, return them ordered by row position (unassigned categories last, alphabetically) | ShoppingListGroup[], row config | ShoppingListGroup[] (reordered) |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 3     |
| Must Have     | 3     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                          | Title                                             | Priority | Status   |
| --------------------------------- | ------------------------------------------------- | -------- | -------- |
| 001-store-rows-schema             | Store rows schema                                 | Must     | Complete |
| 002-reorder-shopping-list-by-rows | Reorder shopping list by rows                     | Must     | Complete |
| 003-default-grocery-store-rows    | Default grocery store rows & category assignments | Must     | Planned  |

---

## Dependencies

### Depends On

| Unit | Reason                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| None | References ingredient `category` strings conceptually, not via a hard FK — `001-dinner-catalog` is already complete and its category field is unchanged |

### Depended By

| Unit                         | Reason                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| 003-weekly-dinner-planner-ui | Config page UI; shopping list view calls the reorder function |

### External Dependencies

| System              | Purpose     | Risk |
| ------------------- | ----------- | ---- |
| Supabase (Postgres) | Schema, RLS | Low  |

---

## Technical Context

### Suggested Technology

Supabase migration (SQL) for `grocery_store_rows` + category assignment, per `standards/data-stack.md`. Reorder function is a small pure TypeScript function (mirrors `aggregate.ts`'s existing style), consuming row config fetched via the Supabase client.

### Integration Points

| Integration                  | Type          | Protocol                    |
| ---------------------------- | ------------- | --------------------------- |
| 003-weekly-dinner-planner-ui | DB read/write | Supabase client (PostgREST) |

### Data Storage

| Data                              | Type           | Volume                                          | Retention  |
| --------------------------------- | -------------- | ----------------------------------------------- | ---------- |
| Store rows + category assignments | Postgres (SQL) | Single household — a handful of rows/categories | Indefinite |

---

## Constraints

- Category-level granularity only for this round — no per-ingredient override (e.g. "almond milk" can't live in a different row than the rest of "Dairy"). Flagged as an open question if this proves insufficient (see `requirements.md`).
- Must not break the shopping list when no config exists yet — falls back to today's alphabetical order.

---

## Success Criteria

### Functional

- [x] Rows can be added, named, and reordered; positions stay unique after a reorder (relaxed from "contiguous" during Stage 2 — see `ddd-02-technical-design.md`; a gap after deleting a row is cosmetically invisible since `ORDER BY position` still works)
- [x] Each ingredient category can be assigned to exactly one row
- [ ] Shopping list groups sort by row position when config exists; unassigned/unconfigured categories fall back to alphabetical order after configured rows — client-side reorder function is bolt `013`'s job

### Non-Functional

- [x] RLS restricts read/write to authenticated household session only

### Quality

- [x] All schema/RPC acceptance criteria met (live-verified via `supabase db query`, see `ddd-03-test-report.md`)
- [x] Reorder RPC covered by a pgTAP regression suite (`supabase/tests/database/grocery_store_config_test.sql`)

---

## Bolt Suggestions

| Bolt                     | Type   | Stories                                                  | Objective                                                                                                                                                         |
| ------------------------ | ------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 011-grocery-store-config | DDD    | 001-store-rows-schema, 002-reorder-shopping-list-by-rows | `grocery_store_rows` schema + category assignment + reorder function                                                                                              |
| 021-grocery-store-config | Simple | 003-default-grocery-store-rows                           | One-time seed migration: replace row config with 5 default rows (Dairy, Grains, Pantry, Produce, Protein) + 5 matching category assignments. No schema/RPC change |

---

## Notes

New unit added 2026-08-27, post-deployment, after the user described wanting the shopping list ordered to match how they actually walk their store (Dairy first, Produce moved to last, then Bakery, as their example). Kept independent of `001-dinner-catalog`/`002-weekly-planning` since it introduces a genuinely new domain concept rather than extending either existing one. See `inception-log.md` Scope Changes.

**Revised 2026-08-28 (enhancement round 3)**: added FR-15 and story `003-default-grocery-store-rows`, planned as bolt `021-grocery-store-config`. Ships a one-time seed migration that **replaces** any existing row config with 5 default rows (Dairy, Grains, Pantry, Produce, Protein) and auto-assigns the 5 seed ingredient categories one-to-one. Simple bolt, not DDD — no schema, entity, or RPC change. User chose "replace" over "merge" during requirements intake. See `inception-log.md` Scope Changes.
