---
unit: 002-store-placement-control
intent: 013-placement-edit-control
phase: inception
status: ready
created: '2026-09-05T17:30:00Z'
updated: '2026-09-05T17:30:00Z'
---

# Unit Brief: Store Placement Control

## Purpose

Make `/store` the place where the household has final say: find any grocery by name, move it,
move a whole category, see everything a stop actually holds, and work through what arrived
recently and has not been checked.

This is the bulk of intent `013`'s user-visible value. Today roughly 20 of 121 items are
reachable and no category can be moved at all.

## Scope

### In Scope

- An all-groceries searchable list showing each item's stop and how it got there
- Category → stop moves, writing `category_placements` for the first time
- Removing `LocationRow`'s four-item display cap
- Re-scoping `UnassignedSection` from `unassigned` items to **unreviewed** items
- Surfacing `010`'s local similarity suggestion on each unreviewed row
- Dropping the in-recipe narrowing (`useInRecipeNameKeys` / `fetchInRecipeNameKeys`) unless the
  new list has a stated reason to keep it

### Out of Scope

- The `reviewed_at` column and its write path — unit `001`
- The shopping-list entry point — unit `003`
- Redesigning `AssignSheet`, the similarity algorithm, or dismissals. All three are reused as-is
  from `010`; this unit adds callers, not behaviour
- Any Claude/API call. Every suggestion here is local — the escalation is intent `014`

---

## Assigned Requirements

| FR   | Title                                                     | Priority |
| ---- | --------------------------------------------------------- | -------- |
| FR-1 | Every item is reachable by name                           | Must     |
| FR-2 | Move a whole category to a stop                           | Must     |
| FR-3 | Stops list what they actually hold                        | Must     |
| FR-5 | "New — needs review" replaces the unassigned-only section | Must     |
| FR-7 | A suggested stop for unreviewed items                     | Should   |

## Key Constraints

- **No schema or policy work.** `category_placements` has carried household-scoped
  SELECT/INSERT/UPDATE/DELETE policies since `010`'s migration A. This unit is the first thing
  to write to it. If a policy turns out to be missing or wrong, that is a finding to raise, not
  to paper over with a new migration in this unit.
- **A category move replaces, never adds.** `unique (store_id, category)` already enforces this;
  the UI must not present it as additive.
- **Resolution order must stay observable.** Moving a category moves its inheriting items and
  leaves explicitly-placed ones alone. That is `010` FR-6's contract and the most valuable thing
  this unit can demonstrate visibly.
- **Neutral empty states.** `010` FR-6's standing rule — no red, no warning styling — applies to
  every list this unit adds.
- Uncapping stop rows must not degrade mobile scrolling; 121 items today, smooth to ~500.

## Interfaces Consumed

| Interface                           | From        | Notes                                                 |
| ----------------------------------- | ----------- | ----------------------------------------------------- |
| `items.reviewed_at` + mark-reviewed | unit `001`  | Drives the queue and clears rows from it              |
| `AssignSheet`                       | `010` FR-12 | The one move flow; gains new entry points             |
| `similarity.ts`                     | `010` FR-7  | Proposes a stop; must respect `suggestion_dismissals` |
| `item_location_resolution`          | `010` FR-6  | Unchanged; the single source of placement truth       |

## Dependencies

**Requires**: `001-placement-review-state`

**Enables**: `003-shopping-list-move`

## Definition of Done

- Every one of the household's items is reachable by name and movable
- A category move visibly relocates its inheriting items and leaves overrides in place
- Expanding a stop shows everything under it; the collapsed count equals the true total
- The review queue lists exactly the unreviewed items, and both actions clear a row
- `Bakery`, `Aisle 1` and `Garmantasdf` can each hold a manually placed item — the concrete
  thing that was impossible before this intent
- `tsc -b`, `eslint`, `vitest` all green; no orphaned tests asserting removed behaviour
