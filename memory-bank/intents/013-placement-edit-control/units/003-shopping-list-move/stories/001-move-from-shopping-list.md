---
id: 001-move-from-shopping-list
unit: 003-shopping-list-move
intent: 013-placement-edit-control
status: planned
priority: should
created: '2026-09-05T17:30:00Z'
assigned_bolt: 058-shopping-list-move
implemented: false
---

# Story: 001-move-from-shopping-list

## User Story

**As a** household member standing in the store
**I want** to move a grocery to the right stop the moment I notice it is wrong
**So that** the fix happens where the problem is, instead of depending on me remembering later

## Acceptance Criteria

- [ ] **Given** the shopping list, **When** an item's move action is used, **Then** the same
      `AssignSheet` opens as on the store page — same flow, same suggestions, new entry point.
- [ ] **Given** a completed move, **When** the sheet closes, **Then** the list re-sorts to the
      new walking-path order **without a full page reload**.
- [ ] **Given** a move from this surface, **When** written, **Then** it writes an **item**
      placement, never a category placement. From the shopping list the user is saying "this
      thing is here", not "everything like it is here".
- [ ] **Given** a move, **When** it completes, **Then** the item is also marked reviewed.
- [ ] **Given** items already checked off, **When** the list re-sorts, **Then** check state is
      preserved.
- [ ] **Given** the primary use of the page, **When** the move affordance is added, **Then**
      checking items off is no harder than before — proven by the existing shopping-list tests
      staying green **without modification**.

## Technical Notes

- The affordance's discoverability is in genuine tension with the page's primary job. If the
  only way to make it discoverable is to make checking off worse, **say so rather than shipping
  the compromise** — this unit is `Should` and can be cut cleanly.
- Re-sorting reuses `reorderGroupsByLocation` from intent 010 FR-17; no new sort logic.
- Scroll position mid-shop matters more here than anywhere else in the app. A re-sort that
  jumps the user to the top of a half-completed list is a worse outcome than not offering the
  move at all.

## Dependencies

### Requires

- Unit 001 (mark reviewed)
- Unit 002, story 001 (the move flow and its row presentation)

### Enables

- None

## Edge Cases

| Scenario                                               | Expected Behavior                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| A move that changes the item's group position mid-shop | List re-sorts; check state and scroll position preserved                          |
| The item is already explicitly placed                  | The sheet offers "Take it off the path" as it does on the store page              |
| Offline or a failed write                              | The move fails visibly and the list is unchanged; no optimistic reorder that lies |

## Out of Scope

- Category moves from this surface
- Any change to how the list groups or aggregates items
