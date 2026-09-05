---
unit: 003-shopping-list-move
intent: 013-placement-edit-control
phase: inception
status: ready
created: '2026-09-05T17:30:00Z'
updated: '2026-09-05T17:30:00Z'
---

# Unit Brief: Shopping List Move

## Purpose

Let a mismatch be fixed where it is noticed. You discover that eggs are not in Dairy at your
store while you are standing in the store looking at the list — not later, at the config page,
if you remember.

## Scope

### In Scope

- A per-item move affordance on the shopping list, opening the same assign flow as `/store`
- Re-sorting the list to the new walking-path order after a move, without a full reload
- Marking the moved item reviewed

### Out of Scope

- Category moves. From the shopping list a move means "this thing is here", never "everything
  like it is here" — that distinction is the point, and category moves stay on `/store`
- Any new placement mechanism. This is a new entry point to unit `002`'s flow, nothing more
- Changing how the list groups or aggregates items (`010` FR-17 is unchanged)

---

## Assigned Requirements

| FR   | Title                       | Priority |
| ---- | --------------------------- | -------- |
| FR-4 | Move from the shopping list | Should   |

## Key Constraints

- **The list's primary job is checking things off.** The move affordance must not compete with
  it. If the only way to make the move discoverable is to make the list worse, say so rather
  than shipping the compromise — this unit is `Should` and can be cut cleanly.
- **Item placements only.** Never writes `category_placements`.
- Re-sorting after a move must not lose check state or scroll position mid-shop.

## Interfaces Consumed

| Interface                     | From                    | Notes                              |
| ----------------------------- | ----------------------- | ---------------------------------- |
| `AssignSheet` + place/unplace | unit `002`, `010` FR-12 | Same flow, new caller              |
| Mark-reviewed                 | unit `001`              | A move implies review              |
| `reorderGroupsByLocation`     | `010` FR-17             | Existing sort; re-run after a move |

## Dependencies

**Requires**: `001-placement-review-state`, `002-store-placement-control`

**Enables**: none — this is the last unit of the intent

## Definition of Done

- An item can be moved from the shopping list and the list re-sorts to match
- The moved item is marked reviewed
- Checking items off is no harder than before — verified by keeping the existing shopping-list
  tests green without modification
- `tsc -b`, `eslint`, `vitest` all green
