---
id: 001-store-rows-schema
unit: 004-grocery-store-config
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-27T01:00:00Z'
assigned_bolt: 011-grocery-store-config
implemented: true
---

# Story: 001-store-rows-schema

## User Story

**As a** wife who shops the same store every week
**I want** to define my store's aisle sections in the order I walk them, and say which grocery category belongs in each
**So that** my shopping list can eventually be ordered the same way

## Acceptance Criteria

- [ ] **Given** no rows exist yet, **When** I add a row named "Dairy", **Then** it's created at position 1
- [ ] **Given** rows "Dairy" (1) and "Produce" (2) exist, **When** I add "Bakery" at the end, **Then** it's created at position 3
- [ ] **Given** "Produce" is at position 2 of 3, **When** I move it to the last position, **Then** it becomes position 3 and "Bakery" shifts to position 2 (positions stay contiguous, 1..N)
- [ ] **Given** the category "Dairy" (an ingredient category string), **When** I assign it to the "Dairy" row, **Then** that assignment is stored and queryable
- [ ] **Given** a category has no row assigned, **When** queried, **Then** it simply has no assignment (not an error) — reorder logic (`002-reorder-shopping-list-by-rows`) handles the fallback

## Technical Notes

- New migration file (this is a brand-new unit, no existing schema to be additive against).
- Suggested shape: `grocery_store_rows` (id, name, position int, unique position within the single household's config), `grocery_row_categories` (category text, row_id, unique on category — one row per category).
- Single shared household config (no per-user rows) — same RLS pattern as existing tables (household-session gate on auth only), per `system-architecture.md`.
- Reordering (shifting positions) should be a single transaction/RPC, not N separate client updates, to avoid a moment where two rows share a position.

## Dependencies

### Requires

- None (foundational story for this new unit)

### Enables

- `002-reorder-shopping-list-by-rows` (same unit)
- `014-grocery-store-config-page` (unit 003) — the config UI

## Edge Cases

| Scenario                                          | Expected Behavior                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding a row with a name that already exists      | Allowed to be rejected as a duplicate, or allowed as a separate row — decide during domain modeling; recommend rejecting duplicates for clarity |
| Deleting a row that has categories assigned to it | Those categories become unassigned (fall back to alphabetical), not deleted or orphaned                                                         |

## Out of Scope

- The reorder-shopping-list function itself (→ `002-reorder-shopping-list-by-rows`)
- Config page UI (→ `014-grocery-store-config-page`)
- Per-ingredient overrides beyond category-level (open question, not this round)
