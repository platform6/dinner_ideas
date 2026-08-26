---
id: 003-last-chosen-query
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
status: complete
priority: should
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 003-last-chosen-query

## User Story

**As a** wife picking dinners for the week
**I want** to see how recently (if ever) each dinner was last chosen
**So that** I naturally lean toward variety instead of repeating the same meals

## Acceptance Criteria

- [ ] **Given** a dinner has appeared in one or more locked weekly plans, **When** its last-chosen date is queried, **Then** the most recent locked plan's start date is returned
- [ ] **Given** a dinner has never appeared in a locked weekly plan, **When** its last-chosen date is queried, **Then** it is returned as "never chosen" (null)
- [ ] **Given** the full dinner list, **When** last-chosen dates are queried in bulk, **Then** results are returned efficiently in one query (not N+1 per dinner)

## Technical Notes

- Implement as a Postgres view (e.g. `dinner_last_chosen`) joining `dinners` to the most recent *locked* `weekly_plan_selections`/`weekly_plans` row.
- Only locked plans count — an unlocked plan being edited (even if it momentarily has 3 selections) doesn't affect recency, since it hasn't actually been sent/made yet.

## Dependencies

### Requires
- 001-weekly-plan-schema
- 002-enforce-exactly-three-immutable (so "locked" has a reliable meaning)

### Enables
- `003-weekly-dinner-planner-ui` variety-indicator story

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Dinner chosen in multiple past weeks | Returns the most recent date only |

## Out of Scope

- The UI presentation of this data (badges, sort order) — see `003-weekly-dinner-planner-ui` variety-indicator story
