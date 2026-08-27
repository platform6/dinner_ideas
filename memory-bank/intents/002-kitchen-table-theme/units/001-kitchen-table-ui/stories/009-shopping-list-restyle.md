---
id: 009-shopping-list-restyle
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 009-shopping-list-restyle

## User Story

**As a** wife shopping with the list
**I want** to check items off as I go, grouped clearly by store section
**So that** I don't lose my place walking the aisles

## Acceptance Criteria

- [ ] **Given** `ShoppingListPage.tsx`, **When** rendered, **Then** the eyebrow shows "N DINNERS · N ITEMS" and the title reads "Shopping list", with a 40px `brand.100` `Copy` tile top-right
- [ ] **Given** each category group (from `buildShoppingList` + `reorderGroupsByRows`), **When** rendered, **Then** it shows a `categoryIcon` + uppercase `sectionLabel` in `brand.500` + a `line.subtle` rule filling the remaining width
- [ ] **Given** each item, **When** rendered, **Then** it's a 19px checkbox + quantity/unit (500 weight, `ink.500`, 56px min-width column) + name
- [ ] **Given** an item is checked, **When** toggled, **Then** it turns `ink.200` with strikethrough — this is new local component state, not persisted anywhere
- [ ] **Given** the sticky footer, **When** rendered, **Then** it keeps the existing "lock on copy" checkbox and copy action, restyled as a 52px olive button with `Copy`
- [ ] **Given** the group order, **When** rendered, **Then** it still comes from `004-grocery-store-config`'s `reorderGroupsByRows` — this story changes presentation only, never the order-computation logic

## Technical Notes

- Checked-item state: a local `Set<string>` keyed by a stable item identifier (e.g. `${category}-${name}-${unit}`), reset on remount — no query/mutation involved.

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`

### Enables

- None

## Edge Cases

| Scenario                                                                | Expected Behavior                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| An unconfigured category (`004-grocery-store-config` has no row for it) | Falls back to `categoryIcons.Other` and alphabetical position, same as the existing reorder fallback |

## Out of Scope

- Any other screen
- Persisting checked-item state
