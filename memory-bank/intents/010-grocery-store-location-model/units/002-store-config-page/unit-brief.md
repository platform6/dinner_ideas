---
unit: 002-store-config-page
intent: 010-grocery-store-location-model
phase: inception
status: complete
created: '2026-09-04T14:30:00Z'
updated: '2026-09-04T14:30:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Store Config Page ("Walking Path")

## Purpose

Rework `src/features/store-config/` from the two-panel "Rows + Category Assignments" layout
into the "Walking path" page: one ordered list, item-level placement with a similarity assist,
a calm unassigned section, and the desktop/first-run treatments — the full visual spec in
`storeconfig.md`.

## Scope

### In Scope

- Client-side similarity-matching algorithm (FR-7)
- Walking-path list: rows, add/rename/reorder/remove, expand/collapse item preview (FR-11)
- Assign bottom sheet: resolution line, suggestions, picker, unlink (FR-12)
- "Not on the path yet" section (FR-13)
- First-run empty state (FR-14) and desktop layout (FR-15)
- Delete-a-Location-with-items destructive confirm (FR-16)

### Out of Scope

- The data model, resolution query, reorder RPC (unit 1)
- The shopping-list sort (unit 3)
- Multi-store selector UI, drag-and-drop, inline item editing (v2/deferred; layout already
  reserves the space per `storeconfig.md`'s "v2 slots")

---

## Assigned Requirements

| FR    | Requirement                     | Priority |
| ----- | ------------------------------- | -------- |
| FR-7  | Similarity-suggestion algorithm | Must     |
| FR-11 | Walking-path list UI            | Must     |
| FR-12 | Assign flow                     | Must     |
| FR-13 | Unassigned section              | Must     |
| FR-14 | First-run empty state           | Should   |
| FR-15 | Desktop layout                  | Should   |
| FR-16 | Delete-with-items confirm       | Must     |

---

## Domain Concepts

_None new._ Consumes unit 1's `Location`, `Item`, `ItemPlacement`, `CategoryPlacement`,
`SuggestionDismissal`, and the resolution query.

### Key Operations

| Operation                          | Description                                                                                       | Inputs                                | Outputs                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| Score similarity candidates        | normalize + token-overlap + rarer-token weighting + category tiebreaker, minus dismissed pairings | item name, placed items, dismissals   | 0–3 ranked candidates above cutoff |
| Place / re-place / unplace an Item | write/delete its `item_placements` row                                                            | `item_id`, `store_id`, `location_id?` | resolved state updates             |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 7     |
| Must Have     | 5     |
| Should Have   | 1     |
| Could Have    | 0     |

(1 story — tests — spans Must priority across the unit; see below.)

### Stories

| Story ID                    | Title                                                      | Priority | Status  |
| --------------------------- | ---------------------------------------------------------- | -------- | ------- |
| 001-similarity-algorithm    | Client-side similarity scoring (pure function)             | Must     | Planned |
| 002-walking-path-list       | Location rows, lifecycle, reorder                          | Must     | Planned |
| 003-assign-flow             | Bottom sheet: resolution line, suggestions, picker, unlink | Must     | Planned |
| 004-unassigned-section      | "Not on the path yet"                                      | Must     | Planned |
| 005-first-run-and-desktop   | Empty state + desktop measure/layout                       | Should   | Planned |
| 006-delete-location-confirm | The one destructive confirm on the page                    | Must     | Planned |
| 007-store-config-tests      | Consolidated test coverage                                 | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                      | Reason                                             |
| ------------------------- | -------------------------------------------------- |
| `001-location-item-model` | Every table, the resolution query, the reorder RPC |

### Depended By

_None._

### External Dependencies

| System   | Purpose                                        | Risk |
| -------- | ---------------------------------------------- | ---- |
| None new | Existing theme tokens only; no new npm package | Low  |

---

## Technical Context

### Suggested Technology

Chakra UI v2 + existing theme (no new tokens, no new theme variant). TanStack Query for the
data layer. A pure `similarity.ts` module for FR-7, unit-tested in isolation.

---

## Constraints

- No new tokens, no new theme variant — the one filled `heart.500` ("Remove") is styled at
  the call site, same rule as intent `009`'s "Clear all".
- No motion — no transition on expand, no animation on reorder, no slide beyond platform
  default.
- Similarity is suggestion-only — never auto-assigns.
- No drag-and-drop, no inline item/category editing in v1.

---

## Success Criteria

### Functional

- [ ] One ordered list, sections and aisles as visual peers, reorder via arrows
- [ ] Assign flow surfaces suggestions only when they clear the cutoff; accepting/dismissing
      both work; the picker is always available
- [ ] Unassigned section defaults to items in ≥1 recipe; search reaches the full catalog
- [ ] Deleting a Location with items shows the one destructive confirm; an empty Location
      needs none

### Non-Functional

- [ ] Every arrow/pill/icon-button has an aria-label; assign sheet traps focus, closes on
      `Escape`, returns focus on close
- [ ] Desktop: single column, no second panel

### Quality

- [ ] `tsc -b`, `eslint`, `vite build` clean; all acceptance criteria met; code reviewed

---

## Bolt Suggestions

| Bolt                  | Type   | Stories            | Objective                                                           |
| --------------------- | ------ | ------------------ | ------------------------------------------------------------------- |
| 052-store-config-page | Simple | 001, 002, 006      | Similarity engine + the walking-path list + its destructive confirm |
| 053-store-config-page | Simple | 003, 004, 005, 007 | The assign flow + unassigned section + first-run/desktop + tests    |

Sequence: `050/051 → 052 → 053`.
