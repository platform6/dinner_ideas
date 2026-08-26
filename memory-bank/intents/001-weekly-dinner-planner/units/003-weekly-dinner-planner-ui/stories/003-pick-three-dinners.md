---
id: 003-pick-three-dinners
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 003-pick-three-dinners

## User Story

**As a** wife planning the week
**I want** to select up to 3 dinners from the catalog, with each pick saved immediately
**So that** I always have a live, up-to-date plan without a separate "save" step, and can keep changing my mind

## Acceptance Criteria

- [ ] **Given** I'm browsing the catalog, **When** I select a dinner, **Then** it's saved immediately, visibly marked as selected, and a running count is shown (e.g. "2/3 selected")
- [ ] **Given** I already have 3 dinners selected, **When** I try to select a 4th, **Then** I'm blocked and prompted to deselect one first
- [ ] **Given** I have 1–3 dinners selected, **When** I deselect one, **Then** it's removed immediately (as long as the plan isn't locked — see `004-editable-until-locked`)
- [ ] **Given** I have exactly 3 dinners selected, **When** the count hits 3, **Then** the shopping list becomes available to view (see `005-generate-shopping-list`)
- [ ] **Given** I have exactly 3 selected and view the shopping list, **When** I go back and swap one out for another, **Then** the swap is allowed and the shopping list updates accordingly

## Technical Notes

- No separate "confirm" action — each select/deselect is its own persisted mutation (add/remove a `weekly_plan_selections` row) against the current unlocked plan, via `002-weekly-planning`.
- Client-side "max 3" checking is a UX convenience; the real enforcement is the DB trigger from `002-enforce-exactly-three-immutable`.
- A "swap" is two operations (remove then add), not a special API — the DB never needs to see more than 3 rows for a plan at once.

## Dependencies

### Requires
- 002-browse-filter-sort-catalog
- 001-weekly-plan-schema, 002-enforce-exactly-three-immutable (from `002-weekly-planning`)

### Enables
- 004-editable-until-locked
- 005-generate-shopping-list

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| I refresh the page mid-selection | Nothing is lost — every pick was already persisted as I made it |
| No current unlocked plan exists yet (first visit, or last week's plan is locked) | Selecting a dinner creates a new draft `weekly_plans` row automatically |

## Out of Scope

- Locking the plan — that happens when the shopping list is copied, see `006-copy-shopping-list-to-clipboard`
