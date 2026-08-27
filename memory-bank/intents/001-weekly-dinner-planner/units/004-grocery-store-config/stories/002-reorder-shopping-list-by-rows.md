---
id: 002-reorder-shopping-list-by-rows
unit: 004-grocery-store-config
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-27T01:00:00Z'
assigned_bolt: 011-grocery-store-config
implemented: true
---

# Story: 002-reorder-shopping-list-by-rows

## User Story

**As a** wife with a configured store layout
**I want** my shopping list's sections to appear in the same order I'd walk the store
**So that** I don't backtrack while shopping

## Acceptance Criteria

- [ ] **Given** row config Dairy(1)/Bakery(2)/Produce(3) and a shopping list with Dairy, Produce, and Meat groups, **When** the list is sorted, **Then** the order is Dairy, Produce, Meat (Meat has no row, falls back after configured rows, alphabetically among unassigned)
- [ ] **Given** no row config exists at all, **When** the list is sorted, **Then** it falls back to today's behavior — plain alphabetical by category
- [ ] **Given** two unassigned categories, **When** both fall back, **Then** they're ordered alphabetically relative to each other (existing `buildShoppingList` behavior preserved for the unassigned tail)
- [ ] **Given** the row config changes (e.g. "Produce" reordered), **When** the shopping list is next viewed, **Then** it reflects the new order without requiring a new plan/lock

## Technical Notes

- This is a pure function taking `ShoppingListGroup[]` (the existing output of `aggregate.ts#buildShoppingList`) plus the row/category-assignment config, returning a resorted `ShoppingListGroup[]` — mirrors that file's existing style (see `aggregate.test.ts` for the testing pattern to follow).
- `ShoppingListPage.tsx` calls this after `buildShoppingList`, before rendering — an additive step, not a rewrite of the aggregation logic itself.
- Config is fetched once per shopping-list view (small dataset, household-scale) — no need for real-time sync while shopping.

## Dependencies

### Requires

- 001-store-rows-schema (same unit)
- `005-generate-shopping-list` (unit 003) — the existing aggregation this reorders

### Enables

- Full FR-12 experience once wired into `ShoppingListPage.tsx`

## Edge Cases

| Scenario                                                                    | Expected Behavior                                     |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| A category was assigned to a row that's since been deleted                  | Treated as unassigned (falls back), not an error      |
| Config exists but has zero rows configured yet (user hasn't finished setup) | Identical to "no config" — full alphabetical fallback |

## Out of Scope

- The config page UI itself (→ `014-grocery-store-config-page`)
- Changing how ingredients get merged/aggregated (untouched — only the group _order_ changes)
