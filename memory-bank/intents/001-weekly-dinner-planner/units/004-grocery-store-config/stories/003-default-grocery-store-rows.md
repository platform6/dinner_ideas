---
id: 003-default-grocery-store-rows
unit: 004-grocery-store-config
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 021-grocery-store-config
implemented: true
---

# Story: 003-default-grocery-store-rows

## User Story

**As a** household member who hasn't manually configured a store layout
**I want** the store to come pre-loaded with sensible default rows in a fixed order — Dairy, Grains, Pantry, Produce, Protein
**So that** my shopping list is grouped in store order out of the box, with no setup

## Acceptance Criteria

- [ ] **Given** the migration runs, **When** it completes, **Then** `grocery_store_rows` contains exactly: `Dairy` (position 1), `Grains` (position 2), `Pantry` (position 3), `Produce` (position 4), `Protein` (position 5) — any pre-existing rows are removed first (user chose "Replace with defaults").
- [ ] **Given** the migration runs, **When** it completes, **Then** `category_row_assignments` contains exactly 5 rows mapping each seed ingredient category to the row of the same name: `Produce→Produce`, `Pantry→Pantry`, `Protein→Protein`, `Grains→Grains`, `Dairy→Dairy` (category strings match the seed data's exact casing).
- [ ] **Given** the defaults are applied, **When** I open the shopping list for any plan, **Then** its category groups appear in the order Dairy → Grains → Pantry → Produce → Protein.
- [ ] **Given** a category with no row assignment somehow exists (none do in current seed data), **When** the shopping list renders, **Then** it still falls back to alphabetical order after the configured rows (existing FR-12 reorder behaviour, unchanged).
- [ ] **Given** the defaults are in place, **When** I add a new row on the Store Config page, **Then** it takes a position after 5 and the shopping list honours it exactly as in FR-12 — the reorder RPC and Store Config UI are not modified by this story.

## Technical Notes

- New additive migration file under `supabase/migrations/` (e.g. `20260828000000_grocery_store_config_defaults.sql`). Do not edit `20260827040000_grocery_store_config.sql`.
- `delete from public.category_row_assignments;` then `delete from public.grocery_store_rows;` (the FK is `on delete cascade`, so deleting rows alone also clears assignments — deleting both explicitly is clearer), then `insert` the 5 rows and 5 assignments.
- Seed ingredient categories verified against `20260826175606_seed_healthy_family_dinners.sql`: exactly `Produce`, `Pantry`, `Protein`, `Grains`, `Dairy` (no others present).
- This is a one-time data seed against the single household's live data — treat as a data migration, not app-startup logic. No app/TS code changes required; `reorder.ts` already consumes whatever config exists.
- Consider a pgTAP assertion in `supabase/tests/database/` that the 5 rows + 5 assignments exist and positions are 1..5.

## Dependencies

### Requires

- `001-store-rows-schema` (the `grocery_store_rows` + `category_row_assignments` tables — already complete)
- `002-reorder-shopping-list-by-rows` (the reorder function that consumes this config — already complete)

### Enables

- None

## Edge Cases

| Scenario                                                  | Expected Behavior                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Household had already added custom rows                   | They are deleted and replaced by the 5 defaults (explicit user choice)                                                                               |
| Migration re-run / idempotency                            | Wrap inserts so a second run is a no-op or a clean replace (e.g. `on conflict do nothing` on the unique `position`, or delete-then-insert every run) |
| A future dinner introduces a new category (e.g. "Frozen") | Unassigned → sorts alphabetically after the 5 configured rows until the user assigns it — no error                                                   |
| Position uniqueness during insert                         | Insert in ascending position order; positions 1..5 are unique and contiguous                                                                         |

## Out of Scope

- Any change to the reorder RPC (`reorder_grocery_store_row`) or the Store Config page UI
- Per-ingredient row overrides (still category-level only, per the unit's standing constraint)
- Auto-creating rows for categories added after this seed
