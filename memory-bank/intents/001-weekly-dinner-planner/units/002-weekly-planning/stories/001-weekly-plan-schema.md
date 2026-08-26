---
id: 001-weekly-plan-schema
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 001-weekly-plan-schema

## User Story

**As a** developer building the app
**I want** `weekly_plans` and `weekly_plan_selections` tables with RLS enabled
**So that** confirmed weekly picks can be persisted and later queried for shopping-list generation and history

## Acceptance Criteria

- [ ] **Given** the migration is applied, **When** I inspect the schema, **Then** a `weekly_plans` table exists with a start date and a confirmed-at timestamp
- [ ] **Given** the migration is applied, **When** I inspect the schema, **Then** a `weekly_plan_selections` table exists referencing a weekly plan and a dinner
- [ ] **Given** RLS is enabled, **When** an unauthenticated request queries either table, **Then** it is denied
- [ ] **Given** RLS is enabled, **When** the authenticated household session queries either table, **Then** it succeeds

## Technical Notes

- Foreign key from `weekly_plan_selections.dinner_id` to `dinners.id` (from `001-dinner-catalog`).
- This story is schema-only; the exactly-3/immutability rule is enforced in 002-enforce-exactly-three-immutable.

## Dependencies

### Requires
- 001-dinner-catalog-schema (from `001-dinner-catalog`)

### Enables
- 002-enforce-exactly-three-immutable
- 003-last-chosen-query
- `003-weekly-dinner-planner-ui` selection-flow and shopping-list stories

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Two weekly plans with overlapping start dates | Allowed at schema level (app/UI is responsible for only ever having one "current" plan in practice) |

## Out of Scope

- Constraint enforcement (exactly 3, immutability) — see 002-enforce-exactly-three-immutable
