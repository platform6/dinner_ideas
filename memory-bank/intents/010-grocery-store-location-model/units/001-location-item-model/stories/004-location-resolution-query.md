---
id: 004-location-resolution-query
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 050-location-item-model
implemented: true
---

# Story: 004-location-resolution-query

## User Story

**As a** developer building both the store-config page and the shopping-list sort
**I want** one query that resolves every Item's location and placement state
**So that** unit 2 (display) and unit 3 (sort key) read the exact same resolution logic and
can never disagree

## Acceptance Criteria

- [ ] **Given** an Item and a Store, **When** resolved, **Then** the order is exactly: (1) an
      `item_placements` row for `(item_id, store_id)` → **Placed**; (2) else a
      `category_placements` row for `(item's category, store_id)` → **Inherited**; (3) else
      → **Unassigned**.
- [ ] **Given** the query, **When** it runs for a whole Store, **Then** it returns every Item
      relevant to that household with its resolved `location_id` (or `null`) and its state
      (`placed | inherited | unassigned`) in one shape both unit 2 and unit 3 consume.
- [ ] **Given** an Item's "category" for the inheritance step, **When** resolved, **Then** it
      is read from `dinner_ingredients.category` for that ingredient name (most recent /
      first-seen if it varies across dinners — Assumption in `requirements.md`).
- [ ] **Given** an Item with **no** placement at either level, **When** resolved, **Then**
      the query returns `unassigned` — never an error, never a null crash downstream.

## Technical Notes

- Implementable as a SQL view or a plain parameterized query composed at the application
  layer — construction picks whichever is simpler to keep in sync with story 003's tables;
  either way it is the **one** place this logic lives (no duplicate resolution logic in unit
  2 or unit 3).
- This is the "resolution" the requirements call FR-6's data side; unit 2 owns displaying the
  three states as UI (Placed / Inherited / Not placed pills).

## Dependencies

### Requires

- 003-item-and-category-placements

### Enables

- (Unit 2) FR-6 display, FR-11/12/13
- (Unit 3) FR-17 shopping-list sort key
- 007-cutover-migration (its "equivalent order" acceptance criterion is verified against this
  query)

## Edge Cases

| Scenario                                                           | Expected Behavior                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| An Item's `dinner_ingredients.category` differs across two dinners | Documented assumption: use the most recent/first-seen consistently; not a blocker                       |
| An Item with a category that has no `category_placements` row      | Resolves to `unassigned`, same as no category at all                                                    |
| Two Items share a Location via inheritance                         | Both resolve correctly and independently; no uniqueness conflict (inheritance is many-to-one by design) |

## Out of Scope

- The UI rendering of the three states (unit 2)
- The shopping-list group-ordering itself (unit 3)
