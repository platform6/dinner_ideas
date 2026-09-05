---
id: 002-category-move
unit: 002-store-placement-control
intent: 013-placement-edit-control
status: planned
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 056-store-placement-control
implemented: false
---

# Story: 002-category-move

## User Story

**As a** household member whose store rearranged its dairy aisle
**I want** to move a whole category to a different stop in one action
**So that** I do not have to re-place eight items by hand to say one thing

## Acceptance Criteria

- [ ] **Given** the five categories, **When** the page renders, **Then** each can be assigned to
      any stop in the active store.
- [ ] **Given** a category already placed, **When** it is moved, **Then** the previous mapping is
      **replaced**, not duplicated. `unique (store_id, category)` enforces this; the UI must
      present it as a move rather than an add.
- [ ] **Given** items inheriting from that category, **When** it moves, **Then** they visibly
      move with it.
- [ ] **Given** an item with its **own** explicit placement, **When** its category moves,
      **Then** it **stays where it is** — the resolution order from intent 010 FR-6 is
      preserved, and this is the most valuable thing this story can demonstrate visibly.
- [ ] **Given** a placed category, **When** it is unplaced, **Then** its items become unassigned
      and this reads as a normal state, not an error.
- [ ] **Given** any category move, **When** the shopping list is next read, **Then** it re-sorts
      to match.

## Technical Notes

- **No schema or policy work.** `category_placements` has carried household-scoped
  SELECT/INSERT/UPDATE/DELETE policies since intent 010's migration A and has never been written
  to. This story is the first writer. If a policy proves missing or wrong, **raise it** rather
  than adding a migration inside this unit.
- Today the UI only ever counts `category_placements` (`countPlacementsAtLocation`). The write
  side is new.
- An upsert on the unique key is the natural shape, mirroring how `placeItem` handles
  `item_placements`.

## Dependencies

### Requires

- None (independent of the review state)

### Enables

- 003-uncapped-stop-rows (which surfaces the category entry at a stop)

## Edge Cases

| Scenario                                             | Expected Behavior                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Moving a category to the stop it already occupies    | No-op; not an error                                                       |
| Two members move the same category concurrently      | Last write wins; the unique constraint prevents duplicates                |
| A stop is deleted while holding a category placement | Already handled — the delete in intent 010 cascades `category_placements` |

## Out of Scope

- Letting a **stop** claim a category from the stop's side (open question, Checkpoint 3)
- User-defined categories
