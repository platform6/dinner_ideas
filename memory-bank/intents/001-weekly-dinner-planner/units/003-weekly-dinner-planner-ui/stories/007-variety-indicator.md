---
id: 007-variety-indicator
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: should
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 007-variety-indicator

## User Story

**As a** wife choosing dinners
**I want** to see when each dinner was last made
**So that** I naturally rotate through options instead of repeating recent meals

## Acceptance Criteria

- [ ] **Given** a dinner was chosen in a past confirmed plan, **When** I view it in the catalog, **Then** I see when it was last made (e.g. "Last made 2 weeks ago")
- [ ] **Given** a dinner has never been chosen, **When** I view it in the catalog, **Then** I see an indicator like "New" or "Never made"
- [ ] **Given** the default catalog view, **When** no other sort is applied, **Then** dinners not made recently are surfaced ahead of recently-repeated ones

## Technical Notes

- Backed by the `003-last-chosen-query` view/query from `002-weekly-planning`.
- This is a nudge, not a restriction — recently-made dinners remain fully selectable (per FR-4 being "Should", not a hard block).

## Dependencies

### Requires
- 002-browse-filter-sort-catalog
- 003-last-chosen-query (from `002-weekly-planning`)

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| All dinners have been made recently | Still renders normally, just without a strong variety signal — no error state |

## Out of Scope

- Any hard rule preventing repeat selection
