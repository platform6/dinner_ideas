---
id: 003-uncapped-stop-rows
unit: 002-store-placement-control
intent: 013-placement-edit-control
status: planned
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 056-store-placement-control
implemented: false
---

# Story: 003-uncapped-stop-rows

## User Story

**As a** household member looking at a stop on my walking path
**I want** to see everything that is actually there
**So that** the page is not quietly lying to me about what I will find

## Acceptance Criteria

- [ ] **Given** an expanded stop, **When** it renders, **Then** it lists **all** items resolving
      there, with no silent truncation. `EXPANDED_ITEM_CAP = 4` is removed.
- [ ] **Given** any listed item, **When** its move action is used, **Then** the same assign flow
      opens as from the all-groceries list.
- [ ] **Given** a stop holding a category placement, **When** expanded, **Then** the category
      appears as an entry distinct from the individual items, offering story 002's category move.
- [ ] **Given** a collapsed stop, **When** it shows a preview, **Then** it may abbreviate the
      **names**, but its **count must equal the true total** — an abbreviated preview is fine, a
      wrong number is not.
- [ ] **Given** a stop with 39 items on mobile, **When** expanded, **Then** scrolling stays
      smooth.

## Technical Notes

- `EXPANDED_ITEM_CAP = 4` and `hiddenItemCount` in `LocationRow.tsx` are what this story removes.
  The cap is undocumented in intent 010's requirements — it was an implementation choice, and it
  is what reduced the only working entry point to roughly 20 of 121 items.
- Produce holds 39 items in production today; that is the realistic upper bound to design for.

## Dependencies

### Requires

- 002-category-move (for the category entry)

### Enables

- None

## Edge Cases

| Scenario                                    | Expected Behavior                                           |
| ------------------------------------------- | ----------------------------------------------------------- |
| A stop with nothing at it                   | "Nothing here yet" — existing copy, unchanged               |
| A stop holding only a category and no items | The category entry shows; the item list is empty, neutrally |

## Out of Scope

- Reordering items within a stop — the walking path orders stops, not items
