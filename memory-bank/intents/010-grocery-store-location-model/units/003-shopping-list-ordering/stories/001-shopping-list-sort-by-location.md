---
id: 001-shopping-list-sort-by-location
unit: 003-shopping-list-ordering
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 054-shopping-list-ordering
implemented: false
---

# Story: 001-shopping-list-sort-by-location

## User Story

**As a** household member reading my shopping list
**I want** it grouped in the order I actually walk the store
**So that** I never backtrack for one ingredient

## Acceptance Criteria

- [ ] **Given** the shopping-list group-ordering function, **When** reworked, **Then** its
      sort key becomes each ingredient's resolved `Item → Location` position (unit 1, story
      004's resolution query) — not `category → grocery_store_row.position`.
- [ ] **Given** an ingredient whose Item has no resolved Location (unassigned), **When**
      sorted, **Then** it falls after all located groups, alphabetically — today's fallback,
      preserved.
- [ ] **Given** `buildShoppingList`, **When** this story lands, **Then** its
      aggregation/merge logic is unchanged — only the sort key feeding it changes.
- [ ] **Given** an already-configured household (post-cutover, unit 1 story 007), **When**
      its shopping list is generated, **Then** the group order is equivalent to what the old
      `category → row` model produced for the same data.

## Technical Notes

- Locate the existing group-ordering function (per `001-weekly-dinner-planner` unit `004`,
  now superseded) and swap its data source from `grocery_store_rows`/`category_row_assignments`
  reads to unit 1's resolution query.

## Dependencies

### Requires

- (Unit 1) story 004 (resolution query), story 007 (cutover — for the equivalence check)

### Enables

- 002-shopping-list-ordering-tests

## Edge Cases

| Scenario                                                                                                    | Expected Behavior                                   |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Two ingredients resolve to the same Location                                                                | Grouped together, same as today's same-row behavior |
| An ingredient's Item doesn't exist yet (never written through the trigger — should not happen post-cutover) | Treated as unassigned; sorts last, alphabetically   |

## Out of Scope

- `buildShoppingList`'s aggregation logic itself
