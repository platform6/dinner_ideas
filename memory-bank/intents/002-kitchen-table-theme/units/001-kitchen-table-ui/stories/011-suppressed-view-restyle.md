---
id: 011-suppressed-view-restyle
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: planned
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: false
---

# Story: 011-suppressed-view-restyle

## User Story

**As a** wife who hid some dinners
**I want** a calm, clearly-separate page for the ones I'm not interested in
**So that** I can bring one back without digging through a toggle

## Acceptance Criteria

- [ ] **Given** the new Suppressed route (from `004-filter-chips-suppressed-route`), **When** visited, **Then** it shows title "Not interested" and the line "Hidden from the catalog. Bring one back any time."
- [ ] **Given** each suppressed dinner, **When** rendered, **Then** it's a row on `paper.subtle` with a 38px `EyeOff` tile, `ink.700` title, `ink.300` metadata, and an outline "Bring back" pill with `RotateCcw`
- [ ] **Given** "Bring back" is tapped, **When** it runs, **Then** it still calls `useSetDinnerActive({ isActive: true })` exactly as before — no behavior change
- [ ] **Given** the end of the list, **When** rendered, **Then** a dashed card closes it with a live count, e.g. "That's everything you've hidden. N dinners still in the catalog."

## Technical Notes

- This is a new page component (the view previously lived inline in `CatalogPage.tsx` behind `showSuppressed`) — extract into its own component, reusing `useSuppressedDinners`/`useDinners` (for the "N still in the catalog" count) and `useSetDinnerActive`.

## Dependencies

### Requires

- `004-filter-chips-suppressed-route` (creates the route this story fills in)

### Enables

- None

## Edge Cases

| Scenario                  | Expected Behavior                                                              |
| ------------------------- | ------------------------------------------------------------------------------ |
| No dinners are suppressed | Empty state text instead of the dashed end-of-list card ("nothing hidden yet") |

## Out of Scope

- The Catalog page's own card overflow menu that triggers suppression (→ `005-suppress-off-card-face`)
