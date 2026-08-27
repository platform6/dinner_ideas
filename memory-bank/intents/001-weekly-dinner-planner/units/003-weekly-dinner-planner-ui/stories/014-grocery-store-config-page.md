---
id: 014-grocery-store-config-page
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: planned
priority: must
created: '2026-08-27T01:00:00Z'
assigned_bolt: 013-weekly-dinner-planner-ui
implemented: false
---

# Story: 014-grocery-store-config-page

## User Story

**As a** wife who shops the same store every week
**I want** a settings page where I list my store's sections in order and say what's in each
**So that** my shopping list matches my actual walk through the store

## Acceptance Criteria

- [ ] **Given** the config page, **When** I add a row named "Dairy", **Then** it appears as position 1 (or the next available position)
- [ ] **Given** rows "Dairy" and "Produce" exist, **When** I reorder "Produce" to the last position, **Then** the list re-renders in the new order immediately
- [ ] **Given** a row exists, **When** I assign the "Bakery" ingredient category to it, **Then** that category shows as assigned to that row
- [ ] **Given** the config is saved, **When** I navigate to the shopping list page, **Then** its groups appear in the configured row order (per `002-reorder-shopping-list-by-rows`)
- [ ] **Given** the config page, **When** I reach it, **Then** it's its own route (e.g. `/store-config`), reachable from app navigation — not buried in another page

## Technical Notes

- New page/route added to the existing `react-router-dom` setup alongside catalog/plan/shopping-list/cooking-view.
- Row reordering UI can be as simple as up/down move buttons per row (no drag-and-drop required) — matches the app's existing low-fuss interaction style (e.g. checkboxes/buttons elsewhere, no complex gestures).
- Category assignment UI: a dropdown per existing ingredient category (derived from the distinct categories already in `dinner_ingredients`, same pattern `CatalogPage.tsx` uses to derive the cuisine filter list) mapped to a row selector.

## Dependencies

### Requires

- `001-store-rows-schema` (unit 004)
- `002-reorder-shopping-list-by-rows` (unit 004)

### Enables

- Full FR-12 experience

## Edge Cases

| Scenario                                                                                                          | Expected Behavior                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Visiting the shopping list before ever configuring rows                                                           | Falls back to today's alphabetical order — no broken/empty state                                |
| A new ingredient category appears later (e.g. new seed dinner introduces "International") that was never assigned | Shows as unassigned on the config page and falls back alphabetically on the list until assigned |

## Out of Scope

- The schema and reorder logic themselves (→ `001-store-rows-schema`, `002-reorder-shopping-list-by-rows`)
- Per-ingredient overrides beyond category-level (open question, not this round)
