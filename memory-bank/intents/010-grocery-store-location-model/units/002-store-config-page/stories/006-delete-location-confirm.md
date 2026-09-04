---
id: 006-delete-location-confirm
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 052-store-config-page
implemented: false
---

# Story: 006-delete-location-confirm

## User Story

**As a** household member removing a stop that has ingredients placed there
**I want** to see exactly what will happen before I confirm
**So that** I never lose track of where things went without warning

## Acceptance Criteria

- [ ] **Given** a Location with `item_placements` and/or `category_placements` pointing at
      it, **When** "Remove" is pressed, **Then** a confirm panel states the affected count
      and the consequence in plain terms: "N groceries point here. They'll fall back to
      their category, or to the end of the list if the category has no spot. Nothing is
      deleted." (Items themselves are never deleted — only the placement rows, per unit 1's
      Resolved Decision on cascade semantics.)
- [ ] **Given** the confirm panel, **When** shown, **Then** it offers exactly two actions:
      "Keep it" (outlined) and "Remove" (filled `heart.500`, styled at the call site — the
      app's only other filled `heart.500` besides intent `009`'s "Clear all"; no theme
      `danger` variant is added).
- [ ] **Given** "Remove" is confirmed, **When** it completes, **Then** the Location is
      deleted (cascading its placement rows per unit 1, story 003) and the walking-path list
      re-renders without it.
- [ ] **Given** an **empty** Location (no placements), **When** "Remove" is pressed,
      **Then** it deletes immediately with no confirm panel (per story 002).

## Technical Notes

- The affected count is a read against `item_placements` + `category_placements` for that
  `location_id` before the delete fires.

## Dependencies

### Requires

- 002-walking-path-list
- (Unit 1) story 003 (cascade behavior)

### Enables

- 007-store-config-tests

## Edge Cases

| Scenario                                                                      | Expected Behavior                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A Location with only a `category_placements` row (no items explicitly placed) | Still counted and warned about — its category loses its default |
| Confirm panel dismissed (Escape / "Keep it")                                  | No change; Location and its placements remain                   |

## Out of Scope

- Any undo for a completed removal (not in `storeconfig.md`'s acceptance criteria; the
  warning + count is the safeguard)
