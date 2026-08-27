---
id: 004-meal-history-schema
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
status: planned
priority: should
created: '2026-08-27T01:00:00Z'
assigned_bolt: 010-weekly-planning
implemented: false
---

# Story: 004-meal-history-schema

## User Story

**As a** wife who wants to look back at past weeks
**I want** an explicit record of what was actually eaten each week
**So that** I can browse history reliably, without it depending on inferring "eaten" from a lock timestamp

## Acceptance Criteria

- [ ] **Given** a plan is locked (its shopping list copied), **When** the lock completes, **Then** one `meal_history` row is written per selected dinner for that week
- [ ] **Given** a `meal_history` row, **When** I query it, **Then** it records the dinner, the week's start date, and which plan it came from
- [ ] **Given** a plan that is never locked (abandoned mid-edit), **When** I query `meal_history`, **Then** no rows exist for it — matches FR-4's existing "only locked plans count" rule
- [ ] **Given** `meal_history` exists, **When** the past-weeks view (`013-week-navigation-view`) queries a specific week, **Then** it can distinguish "eaten" (has `meal_history` rows) from "not yet reached"

## Technical Notes

- Additive migration, does not modify `20260826192038_weekly_planning_schema.sql`.
- Write timing: triggered by the same `lock_weekly_plan` RPC that sets `weekly_plans.locked_at` (see `weekly-plan/api.ts#lockPlan`) — extend that function/trigger to also insert `meal_history` rows for the plan's current selections, rather than doing it as a second round-trip from the client.
- This table becomes the query source for FR-4's "last chosen" lookup going forward, replacing the current direct read of `weekly_plans`/`weekly_plan_selections` — confirm during Construction whether to migrate that query or leave it reading the original tables (both are equivalent once this exists).
- Open question carried from `requirements.md`: confirm lock-time is the right write trigger before implementing (vs. some other "actually eaten" signal).

## Dependencies

### Requires

- 002-enforce-exactly-three-immutable (locking mechanism this hooks into)

### Enables

- `013-week-navigation-view` (unit 003) — past-weeks browsing needs this data

## Edge Cases

| Scenario                                                                 | Expected Behavior                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Locking a plan twice (idempotent lock, per existing `lockPlan` contract) | Does not duplicate `meal_history` rows on the second no-op lock call                             |
| A dinner is suppressed/deleted after its week was eaten                  | `meal_history` row persists regardless (historical record, not a live reference that disappears) |

## Out of Scope

- Week navigation UI itself (→ `013-week-navigation-view`)
- Any explicit "mark as cooked" action (deferred — this story assumes lock = eaten)
