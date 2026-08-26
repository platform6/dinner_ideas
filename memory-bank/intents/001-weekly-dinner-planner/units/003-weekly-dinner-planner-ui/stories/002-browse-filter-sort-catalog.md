---
id: 002-browse-filter-sort-catalog
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 002-browse-filter-sort-catalog

## User Story

**As a** wife choosing dinners for the week
**I want** to browse all dinners and filter/sort them
**So that** I can quickly narrow down to options that fit what I'm in the mood to cook

## Acceptance Criteria

- [ ] **Given** I open the catalog, **When** the page loads, **Then** I see all dinners with name, cuisine, cook time, and Rosie-approved indicator
- [ ] **Given** I select a cuisine filter, **When** applied, **Then** only dinners of that cuisine are shown
- [ ] **Given** I toggle "Rosie-approved only", **When** applied, **Then** only Rosie-approved dinners are shown
- [ ] **Given** I combine multiple filters, **When** applied, **Then** results match all active filters (AND logic)
- [ ] **Given** I clear filters, **When** cleared, **Then** the full catalog is shown again
- [ ] **Given** I choose to sort by cook time, **When** applied, **Then** dinners are ordered fastest-to-slowest

## Technical Notes

- Filtering/sorting happens client-side against the already-fetched catalog (small dataset, per `system-architecture.md` performance NFR) — no per-filter network round trip needed.
- Data fetched via `@tanstack/react-query` from `001-dinner-catalog` tables.
- UI built with Chakra UI components (Select/Checkbox for filters) per `standards/ux-guide.md`.

## Dependencies

### Requires
- 001-household-login
- 001-dinner-catalog-schema, 002-seed-healthy-family-dinners (from `001-dinner-catalog`)

### Enables
- 003-pick-three-dinners

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No dinners match active filters | Show an empty state, not a blank/broken screen |
| Slow/offline network on first load | Show a loading state; if offline and nothing cached yet, show a clear "can't load catalog" message |

## Out of Scope

- Variety/last-chosen sort — see 007-variety-indicator
- Selecting dinners for the week — see 003-pick-three-dinners
