---
id: 009-suppress-dinner
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:39:09Z'
assigned_bolt: null
implemented: true
---

# Story: 009-suppress-dinner

## User Story

**As a** wife browsing the catalog
**I want** to mark a dinner "not interested" so I never see it again
**So that** the catalog stays full of dinners I'd actually consider making

## Acceptance Criteria

- [ ] **Given** I'm viewing any dinner, **When** I choose "Not interested," **Then** it's set inactive and immediately disappears from the default catalog view
- [ ] **Given** I switch to the "Suppressed" filter/view, **When** it loads, **Then** I see all inactive dinners
- [ ] **Given** I'm viewing a suppressed dinner, **When** I choose "Un-suppress," **Then** it's set active again and reappears in the default catalog
- [ ] **Given** a dinner appears in a past confirmed weekly plan, **When** I suppress or un-suppress it, **Then** that historical plan's record is unaffected

## Technical Notes

- Backed by the `is_active` flag on `dinners` from `001-dinner-catalog-schema`.
- Suppress/un-suppress is a simple update mutation (`UPDATE dinners SET is_active = ... WHERE id = ...`) via `@tanstack/react-query`.
- "Suppressed" view reuses the catalog list component with an inverted `is_active` filter, rather than a separate page, to minimize new UI surface.

## Dependencies

### Requires
- 001-dinner-catalog-schema (from `001-dinner-catalog`) — needs the `is_active` column
- 002-browse-filter-sort-catalog — suppress action lives on the catalog view

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Suppressing a dinner that's part of the current in-progress (unconfirmed) selection | Allowed; it's simply removed from the selectable list, in-progress selection of it is cleared |
| Suppressing all dinners of a given cuisine | Allowed — no minimum-catalog-size enforcement; an empty filtered view just shows an empty state |

## Out of Scope

- Permanently deleting a dinner row — suppression is a reversible flag, not a delete
