---
id: 003-assign-flow
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 053-store-config-page
implemented: false
---

# Story: 003-assign-flow

## User Story

**As a** household member placing or re-placing an ingredient
**I want** a focused flow that names its current state in plain words, offers a likely
suggestion when there is one, and otherwise gives me the full path to pick from
**So that** placing an ingredient is fast and I always understand why it sorted where it did

## Acceptance Criteria

- [ ] **Given** any placement pill or a "Place" action in the unassigned section, **When**
      activated, **Then** a bottom sheet opens naming the item and one line of its current
      resolution in plain words ("not placed", "placed in Aisle 1", "following Bakery to
      Bakery") — not a badge.
- [ ] **Given** the similarity algorithm (story 001) clears the cutoff, **When** the sheet
      opens, **Then** a suggestions block sits above the picker: each candidate shows the
      matched item + its location, a "Same spot" accept action, and a dismiss (×) that
      records a `suggestion_dismissals` row (unit 1, story 005). Nothing is pre-selected or
      auto-applied; multiple candidates render with equal weight, no ranking language.
- [ ] **Given** no candidate clears the cutoff, **When** the sheet opens, **Then** the
      suggestions block is simply absent — no "no suggestions found" copy.
- [ ] **Given** the picker, **When** shown, **Then** it lists the full path in order, each
      row using the same type chip as the main list; the current explicit location (if any)
      is marked.
- [ ] **Given** an Item with an explicit placement, **When** the sheet is open, **Then** a
      "Take it off the path" action is available — deletes its `item_placements` row,
      falling back to category/unassigned.
- [ ] **Given** the sheet, **When** open, **Then** it traps focus, closes on `Escape`, and
      returns focus to the pill/button that opened it.

## Technical Notes

- New `src/features/store-config/components/AssignSheet.tsx`.
- "Same spot" and picking a row in the picker are both, at the data layer, the same
  `item_placements` upsert (unit 1, story 003).

## Dependencies

### Requires

- 001-similarity-algorithm
- 002-walking-path-list
- (Unit 1) stories 003, 004, 005

### Enables

- 004-unassigned-section
- 007-store-config-tests

## Edge Cases

| Scenario                                                                                       | Expected Behavior                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Accepting a suggestion, then reopening the sheet for the same item                             | Now shows "placed in {location}" with no suggestions block (it has an explicit placement now)                                             |
| Dismissing a suggestion, then reopening for a different item that resembles the same candidate | Not suppressed — dismissals are per `(item_id, suggested_item_id)` pairing, not per suggested item alone                                  |
| Opening the sheet for an item that's `inherited` (not explicit)                                | Resolution line names the category ("following Bakery to Bakery"); "Take it off the path" is **not** offered (nothing explicit to remove) |

## Out of Scope

- The similarity scoring itself (story 001)
- The unassigned section's own list/search (story 004)
