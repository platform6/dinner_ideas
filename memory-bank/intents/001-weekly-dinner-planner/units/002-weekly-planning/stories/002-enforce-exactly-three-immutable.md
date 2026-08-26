---
id: 002-enforce-exactly-three-immutable
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 002-enforce-exactly-three-immutable

## User Story

**As a** household relying on this app
**I want** to freely change my 3 picks right up until I send the shopping list, and have the plan lock the instant I do
**So that** I can keep tweaking my choices through the week, while still guaranteeing the shopping list I text always matches the final plan

## Acceptance Criteria

- [ ] **Given** a weekly plan with fewer than 3 selections, **When** the shopping list is copied (the lock action), **Then** the database rejects the lock
- [ ] **Given** a weekly plan that already has 3 selections, **When** an attempt is made to add a 4th, **Then** the database rejects it — one must be removed first
- [ ] **Given** an unlocked weekly plan, **When** selections are added or removed, **Then** it is allowed, any number of times
- [ ] **Given** a locked weekly plan, **When** an attempt is made to add, remove, or change its selections, **Then** the database rejects it
- [ ] **Given** a locked weekly plan, **When** an attempt is made to lock it again or change any other field, **Then** the database rejects it

## Technical Notes

- Enforce at the DB layer (Postgres triggers), not just client-side — per `system-architecture.md`, there's no server to fall back on for authorization/validation, and RLS/DB constraints are the only reliable boundary.
- Schema uses `weekly_plans.locked_at` (nullable) rather than a "confirmed" flag — locking happens later, at shopping-list-copy time (see `003-weekly-dinner-planner-ui` shopping-list stories), not at initial selection.
- Three triggers: (1) reject any `weekly_plan_selections` insert past a count of 3 for that plan, (2) reject `weekly_plans` update requiring exactly 3 selections at the point `locked_at` transitions from null to set, (3) reject any further change to a `weekly_plans` row or its selections once `locked_at` is set.

## Dependencies

### Requires
- 001-weekly-plan-schema

### Enables
- Reliable use of `003-weekly-dinner-planner-ui`'s pick/persist and shopping-list/lock stories

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Locking an already-locked plan again | Rejected, not a silent no-op or overwrite |
| Race condition: two near-simultaneous lock attempts | Only one succeeds; the other receives a clear rejection (Postgres row-lock serializes the two updates) |
| Removing a selection then immediately re-adding a different one (a "swap") | Allowed as two separate operations while unlocked; DB never needs to see more than 3 at once |

## Out of Scope

- UI-side validation/messaging (handled in `003-weekly-dinner-planner-ui`, but must not be relied on alone)
- Deciding *when* the lock action fires (that's the copy-to-clipboard story's responsibility)
