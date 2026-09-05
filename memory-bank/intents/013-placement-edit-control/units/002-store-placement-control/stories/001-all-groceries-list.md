---
id: 001-all-groceries-list
unit: 002-store-placement-control
intent: 013-placement-edit-control
status: planned
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 056-store-placement-control
implemented: false
---

# Story: 001-all-groceries-list

## User Story

**As a** household member who keeps noticing things in the wrong aisle
**I want** to find any grocery by name and see where it currently sorts
**So that** I can move it, instead of hunting for it under a stop I do not know

## Acceptance Criteria

- [ ] **Given** the store page, **When** the all-groceries list renders, **Then** it covers
      **every** Item in the household registry, in every placement state — not only unplaced or
      unreviewed ones.
- [ ] **Given** a search term, **When** typed, **Then** matching is case- and
      whitespace-insensitive, consistent with `items.name_key` (`lower(btrim(name))`), so the
      client and the database agree on identity without a join.
- [ ] **Given** a row, **When** shown, **Then** it displays the item name, the stop it currently
      resolves to, and **how** it got there — chosen by the user versus inherited, naming the
      category when inherited (FR-6's `via_category` from intent 010).
- [ ] **Given** a row, **When** its move action is used, **Then** the existing `AssignSheet`
      opens for that item (intent 010 FR-12), unchanged in behaviour.
- [ ] **Given** a registry orphan with no stop at all, **When** listed, **Then** it renders
      neutrally — no red, no warning styling, per the standing rule in intent 010 FR-6.
- [ ] **Given** no search term, **When** listed, **Then** ordering is alphabetical by item name;
      searching narrows the list without reordering it.
- [ ] **Given** 121 items, **When** the list renders on mobile, **Then** scrolling stays smooth;
      the design must hold to roughly 500 items before virtualization is needed.

## Technical Notes

- Reads `item_location_resolution`, which already carries `state`, `via_category`,
  `location_name` and `location_position`. No new query shape is expected.
- Filtering is client-side over the already-loaded resolution query — no round trip per
  keystroke.
- This is the story that makes `spaghetti` findable. Worth using as the manual check.

## Dependencies

### Requires

- Unit 001 (for review state on the same rows, though this story does not itself filter by it)

### Enables

- 004-needs-review-section
- Unit 003's shopping-list move

## Edge Cases

| Scenario                                             | Expected Behavior                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| A household with no items                            | Neutral empty state; no error                                         |
| Two items whose names differ only by case or spacing | The registry already deduped them via `name_key`; only one row exists |
| A search matching nothing                            | Quotes the term back, neutrally                                       |

## Out of Scope

- Category moves (story 002)
- The review queue (story 004)
