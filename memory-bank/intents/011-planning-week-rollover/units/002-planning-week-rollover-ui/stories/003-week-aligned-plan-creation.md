---
id: 003-week-aligned-plan-creation
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 046-planning-week-rollover-ui
implemented: true
---

# Story: 003-week-aligned-plan-creation

## User Story

**As a** household member picking the first dinner of a new week
**I want** the new plan to be filed under _this planning week_
**So that** my picks reappear when I come back, and the week rolls over cleanly next time

## Acceptance Criteria

- [ ] **Given** `useToggleSelection`'s `create-and-add` branch, **When** it creates a plan,
      **Then** it calls `createPlan(currentPlanningWeekStart(weekStartDay))` — not
      `createPlan(todayIsoDate())`.
- [ ] **Given** the codebase after this change, **When** searched, **Then** `todayIsoDate()`
      is **not** used as a `weekly_plans.start_date` anywhere (it remains valid only as the
      `useWeekByOffset` anchor fallback — story 005).
- [ ] **Given** `decideToggleAction` / `toggle-selection.ts`, **When** it needs the
      planning-week start, **Then** the value is threaded in as an argument (or computed at the
      call site and passed) — the pure function's contract changes only by that argument.
- [ ] **Given** I pick the first dinner of a fresh planning week, **When** the mutation
      resolves and I reload, **Then** `useCurrentPlan()` (story 002) finds that plan (its
      `start_date` equals `currentPlanningWeekStart(...)`) and my pick is shown.
- [ ] **Given** an existing unlocked plan for the current planning week, **When** I pick
      another dinner, **Then** the `add` branch is used (no new plan) — unchanged behaviour.

## Technical Notes

- `hooks.ts:72` is the single creation site (`createPlan` has one caller — verified).
- `todayIsoDate()` stays imported for story 005's anchor fallback.

## Dependencies

### Requires

- 001-planning-week-date-helpers
- 002-week-aware-current-plan (so the created plan is the one that gets resolved)

### Enables

- 006-rollover-regression-tests

## Edge Cases

| Scenario                                                   | Expected Behavior                                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| First pick made at 23:59 local on the last day of the week | Plan filed under the ending week's start; at 00:01 the next pick would start a new week's plan              |
| `week_start_day` changes between two picks in one session  | Second pick uses the new week start; `useCurrentPlan` re-keys (story 002) — a rare owner action, acceptable |

## Out of Scope

- Resolving/reading the plan (story 002)
- Rollover recompute (story 005)
