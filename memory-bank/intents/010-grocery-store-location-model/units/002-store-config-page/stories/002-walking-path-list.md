---
id: 002-walking-path-list
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 052-store-config-page
implemented: true
---

# Story: 002-walking-path-list

## User Story

**As a** household member configuring the store
**I want** one ordered list of stops, not two panels
**So that** the page reads as a single walking path rather than duplicated data

## Acceptance Criteria

- [ ] **Given** the page, **When** it renders, **Then** it shows one list — sections and
      aisles as visual peers (same chip size/position/weight, same row height, same
      indentation) — replacing the current "Rows" + "Category Assignments" two-panel layout.
- [ ] **Given** a row, **When** collapsed (default), **Then** it shows: type chip (aisle
      number parsed from `name`, or a section glyph), name, an item-count, up/down arrows
      (disabled at the ends of the list, ≥32px targets, aria-labeled with stop + direction),
      and a one-line preview of the first few placed/inherited item names ("+N more"); a
      Location with nothing shows "Nothing here yet" in the same slot.
- [ ] **Given** a row, **When** expanded, **Then** item rows appear on a distinct ground,
      inset past the chip, capped at 4 rows plus a "+N more" link; expanded state is local
      and does not persist.
- [ ] **Given** the end of the list, **When** rendered, **Then** an inline dashed "Add an
      aisle or section" affordance (not a modal) appends a new stop there; arrows then move
      it.
- [ ] **Given** a row's rename control, **When** activated, **Then** the name becomes an
      in-place text field (existing global focus ring) with Save/Cancel and a quiet "Remove"
      at the trailing edge; the type chip stays visible and unedited during rename.
- [ ] **Given** an arrow press, **When** it fires, **Then** it calls `reorder_location`
      (unit 1, story 006), stops event propagation (doesn't also toggle the row open), and
      announces the result politely ("Bakery moved to position 2").
- [ ] **Given** removing an **empty** stop, **When** confirmed, **Then** no confirmation
      dialog is shown (contrast story 006's destructive confirm for a non-empty stop).

## Technical Notes

- Reworks `src/features/store-config/components/StoreConfigPage.tsx`'s list rendering;
  `types.ts`/`api.ts`/`hooks.ts` move from `GroceryStoreRow`/`CategoryRowAssignment` to
  `Location`/`Item`/placement shapes.
- No new tokens; every color/radius/type value already exists in `src/shared/theme/index.ts`.

## Dependencies

### Requires

- (Unit 1) stories 001, 004, 006

### Enables

- 003-assign-flow
- 006-delete-location-confirm
- 007-store-config-tests

## Edge Cases

| Scenario                                    | Expected Behavior                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| A Location's `name` has no parseable number | Renders as a section chip                                               |
| A Bakery-scale Location with 30+ items      | Collapsed preview stays readable ("+27 more"); expansion caps at 4 rows |
| First-run: no Locations at all              | Handled by story 005's empty state, not this story's row rendering      |

## Out of Scope

- The assign flow itself (story 003)
- The destructive delete-with-items confirm (story 006)
- First-run / desktop (story 005)
