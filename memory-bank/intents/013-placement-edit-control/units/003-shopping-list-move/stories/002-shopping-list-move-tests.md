---
id: 002-shopping-list-move-tests
unit: 003-shopping-list-move
intent: 013-placement-edit-control
status: planned
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 058-shopping-list-move
implemented: false
---

# Story: 002-shopping-list-move-tests

## User Story

**As a** future maintainer
**I want** proof that the move affordance did not cost the shopping list its primary job
**So that** a convenience added for one habit does not quietly degrade the thing the page exists
for

## Acceptance Criteria

- [ ] **Given** the existing shopping-list suite, **When** this unit lands, **Then** every one of
      its tests passes **unmodified** — that is the evidence that checking items off is unchanged.
- [ ] **Given** a move from the list, **When** tested, **Then** a case asserts the list re-sorts
      to the new walking-path order.
- [ ] **Given** a move, **When** tested, **Then** a case asserts an `item_placements` write and
      **no** `category_placements` write.
- [ ] **Given** checked-off items, **When** a move triggers a re-sort, **Then** a case asserts
      check state survives.
- [ ] **Given** a failed write, **When** tested, **Then** a case asserts the list is left
      unchanged — no optimistic reorder that misrepresents what was saved.

## Technical Notes

- The first criterion is deliberately strict. Being _allowed_ to edit the existing tests would
  let a regression be rationalised away; requiring them to pass untouched makes any degradation
  visible as a failure.
- Extends `ShoppingListPage.test.tsx` and `reorder.test.ts` rather than replacing them.

## Dependencies

### Requires

- 001-move-from-shopping-list

### Enables

- None

## Out of Scope

- Re-testing the assign flow itself — covered by unit 002, story 006
