---
unit: 001-location-item-model
intent: 010-grocery-store-location-model
phase: inception
status: complete
created: '2026-09-04T14:30:00Z'
updated: '2026-09-04T14:30:00Z'
unit_type: backend
default_bolt_type: ddd-construction-bolt
---

# Unit Brief: Location/Item Model

## Purpose

Replace `grocery_store_rows` + `category_row_assignments` with a Store→Location→Item model:
individual-ingredient placement with category-level fallback, a new Items registry kept in
sync by a trigger regardless of insertion source, and a multi-store-ready schema. The whole
data layer for intent `010` — everything unit 2 and unit 3 read/write goes through this unit's
tables and functions.

## Scope

### In Scope

- `stores` — household-scoped, ≤1 active, auto-seeded (FR-1)
- `locations` — evolves `grocery_store_rows`; `type`; single ordered `position` per store (FR-2)
- `items` — new registry; `name_key` dedup; trigger-based get-or-create on `dinner_ingredients`
  insert/update, source-agnostic (FR-3)
- `item_placements` / `category_placements` — explicit + inherited placement, composite FKs
  preventing cross-store placement (FR-4, FR-5)
- Location-resolution query: explicit → inherited → unassigned (FR-6)
- `suggestion_dismissals` (FR-8)
- `reorder_location` RPC — generalizes `reorder_grocery_store_row` by `store_id` (FR-9)
- Cutover migration: seed stores, rows→locations, assignments→category_placements, backfill
  items, retire the old tables (FR-10)
- Standards/decision-index updates (FR-18)

### Out of Scope

- Anything UI — unit 2, unit 3
- Multi-store **UI**, drag-and-drop, inline item editing — schema already accommodates all
  three with no future migration
- Recipe import — a future intent; this unit's trigger design is what lets it need no changes
  here

---

## Assigned Requirements

| FR    | Requirement                                    | Priority |
| ----- | ---------------------------------------------- | -------- |
| FR-1  | `stores` entity                                | Must     |
| FR-2  | `locations` entity                             | Must     |
| FR-3  | Items registry + trigger-based sync            | Must     |
| FR-4  | `item_placements`                              | Must     |
| FR-5  | `category_placements`                          | Must     |
| FR-6  | Location resolution + three states (data side) | Must     |
| FR-8  | Suggestion dismissals                          | Must     |
| FR-9  | Reorder RPC generalization                     | Must     |
| FR-10 | Schema + data cutover                          | Must     |
| FR-18 | Standards & decision docs                      | Should   |

---

## Domain Concepts

### Key Entities

| Entity              | Description                                          | Attributes                                             |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Store               | A household's independent walking-path configuration | `household_id`, `name`, `is_active`                    |
| Location            | A stop on the path                                   | `store_id`, `name`, `type` (section/aisle), `position` |
| Item                | A deduped ingredient-name registry row               | `household_id`, `name`, `name_key` (generated)         |
| ItemPlacement       | An Item's explicit Location in one Store             | `item_id`, `store_id`, `location_id`                   |
| CategoryPlacement   | A category's default Location in one Store           | `store_id`, `category`, `location_id`                  |
| SuggestionDismissal | A rejected similarity pairing                        | `store_id`, `item_id`, `suggested_item_id`             |

### Key Operations

| Operation                  | Description                               | Inputs                        | Outputs                                                           |
| -------------------------- | ----------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Resolve an Item's location | explicit → inherited → unassigned         | `item_id`, `store_id`         | `{ location                                                       | null, state }` |
| Reorder a Location         | race-safe shift within one store          | `location_id`, `new_position` | reordered set                                                     |
| Registry sync (trigger)    | get-or-create an Item on ingredient write | `dinner_ingredients` row      | `items` row exists                                                |
| Cutover                    | one-time carry existing config across     | household's old rows          | seeded store + locations + category_placements + backfilled items |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 8     |
| Must Have     | 7     |
| Should Have   | 1     |
| Could Have    | 0     |

### Stories

| Story ID                            | Title                                                    | Priority | Status  |
| ----------------------------------- | -------------------------------------------------------- | -------- | ------- |
| 001-stores-and-locations-schema     | `stores` + `locations` tables, RLS                       | Must     | Planned |
| 002-items-registry-and-sync-trigger | `items` registry + get-or-create trigger                 | Must     | Planned |
| 003-item-and-category-placements    | `item_placements` + `category_placements`, composite FKs | Must     | Planned |
| 004-location-resolution-query       | Explicit → inherited → unassigned resolution             | Must     | Planned |
| 005-suggestion-dismissals           | `suggestion_dismissals` table                            | Must     | Planned |
| 006-reorder-location-rpc            | Generalized race-safe reorder                            | Must     | Planned |
| 007-cutover-migration               | Seed + carry-across + backfill + retire old tables       | Must     | Planned |
| 008-standards-and-decision-docs     | Architecture/decision-index updates                      | Should   | Planned |

---

## Dependencies

### Depends On

| Unit                                                | Reason                                        |
| --------------------------------------------------- | --------------------------------------------- |
| `001-weekly-dinner-planner` unit `004` (superseded) | The model being replaced                      |
| `004-account-model` (complete)                      | Household RLS pattern; `dinners.household_id` |

### Depended By

| Unit                         | Reason                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `002-store-config-page`      | Reads/writes every table + the resolution query + reorder RPC |
| `003-shopping-list-ordering` | Reads the resolution query for the sort key                   |

### External Dependencies

| System            | Purpose                                             | Risk                                     |
| ----------------- | --------------------------------------------------- | ---------------------------------------- |
| Supabase Postgres | 5 new tables, 1 trigger, 1 RPC, 1 cutover migration | Medium (cutover has a no-regression bar) |

---

## Technical Context

### Suggested Technology

Supabase migrations (SQL); pgTAP for DB tests; no RPC beyond `reorder_location` (`security
invoker`, matching the existing pattern); a generated column for `name_key`; composite unique
constraints for the cross-store FK targets.

### Data Storage

| Data                                               | Type       | Volume                                | Retention             |
| -------------------------------------------------- | ---------- | ------------------------------------- | --------------------- |
| `stores`/`locations`/`items`/placements/dismissals | SQL tables | Household-scale (dozens of rows each) | Lifetime of household |

---

## Constraints

- Append-only migrations; no edits to prior files.
- No new RLS shape — mirror `20260828232000` exactly.
- Composite FKs, not application checks, prevent cross-store placement.
- No `item_placements`/`category_placements` row ever has a null `location_id` — absence of
  the row, not a null column, is "no placement" (Resolved Decision #3).
- Cutover creates zero `item_placements` — everything inherits from category on day one.

---

## Success Criteria

### Functional

- [ ] One Store auto-seeded per existing + new household
- [ ] `(store_id, position)` unique through add/reorder/delete on Locations
- [ ] An ingredient written from any path (today's manual entry, or a future import) gets a
      registry Item with no duplicate for the same normalized name
- [ ] Deleting a Location cascades its placements; Items are never deleted
- [ ] Resolution query returns the correct state (explicit/inherited/unassigned) for every
      combination
- [ ] Cutover: a household with existing rows + assignments gets an equivalent path and
      equivalent resolved order, with zero explicit item placements

### Non-Functional

- [ ] RLS isolation verified on every new table (pgTAP)
- [ ] Composite-FK cross-store rejection verified
- [ ] No edits to prior migration files

### Quality

- [ ] `supabase test db` green; code + migration reviewed; ADR written for the Item-registry
      design (Resolved Decisions #1–3)

---

## Bolt Suggestions

| Bolt                    | Type | Stories                      | Objective                                                           |
| ----------------------- | ---- | ---------------------------- | ------------------------------------------------------------------- |
| 050-location-item-model | DDD  | 001, 002, 003, 004, 005, 006 | Every new table, the trigger, the resolution query, the reorder RPC |
| 051-location-item-model | DDD  | 007, 008                     | The cutover migration + standards docs                              |

Sequence: `050 → 051`. `051` needs `050`'s tables to exist before it can carry data into them.

---

## Notes

The Items registry (story 002) is the one genuinely new domain concept in this codebase — no
prior intent introduced anything like it. Its ADR should record the dedup-key choice and the
trigger-vs-app-code decision explicitly, since a future recipe-import intent will read this
ADR rather than re-litigate it.
