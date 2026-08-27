---
id: 004-filter-chips-suppressed-route
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: planned
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: false
---

# Story: 004-filter-chips-suppressed-route

## User Story

**As a** wife filtering the catalog
**I want** filters as tappable chips instead of a dropdown, and suppressed dinners as their own page
**So that** filtering feels immediate on a phone, and hiding dinners doesn't feel like a hidden toggle

## Acceptance Criteria

- [ ] **Given** `CatalogFilters.tsx`, **When** rendered, **Then** the cuisine `<Select>` and tag `<CheckboxGroup>` become a chip row: an active chip is olive-filled, others are 1px `line.DEFAULT` outlines with a leading icon (`Utensils` All, `Clock` Quickest inline)
- [ ] **Given** the full cuisine list and tag list, **When** they don't fit as inline chips, **Then** they're reachable behind a `SlidersHorizontal` overflow chip (Chakra `Menu` or `Drawer`)
- [ ] **Given** the "Show suppressed" `<Switch>`, **When** replaced, **Then** suppressed dinners are reached via a link in the Catalog header to their own route, not a toggle over the same grid
- [ ] **Given** `CatalogPage.tsx`, **When** this story lands, **Then** the `showSuppressed` conditional/branching is removed entirely — the component only ever renders the active catalog
- [ ] **Given** the new Suppressed route, **When** visited, **Then** it renders the restyled view from `011-suppressed-view-restyle` (that story owns the page's own content; this story only owns getting there and un-branching `CatalogPage`)

## Technical Notes

- `CatalogFilters.tsx`'s `CatalogFilterState` (cuisine, tags, sortByCookTime) is unchanged — only its rendering becomes chips, not its shape or the filtering logic in `filters.ts`.
- New route needed: e.g. `/suppressed`, added to `App.tsx` alongside the existing 5.
- `useSuppressedDinners(enabled)`'s `enabled` flag becomes unconditionally true on the new route (it's its own page now, not conditionally rendered) — simplify or repurpose as needed.

## Dependencies

### Requires

- `003-bottom-tab-bar-navigation` (Catalog header established there hosts these links)

### Enables

- `011-suppressed-view-restyle` (the route this story creates)

## Edge Cases

| Scenario                          | Expected Behavior                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| No tags exist yet (fresh install) | Tag filter section of the overflow menu is simply empty/hidden, same as today's `availableTags.length > 0` guard |

## Out of Scope

- The Suppressed page's own visual content (→ `011-suppressed-view-restyle`)
- The card overflow menu for suppressing a dinner (→ `005-suppress-off-card-face`)
