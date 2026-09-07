---
id: 004-rule-tests
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
status: planned
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 063-dinners-per-week-rule
implemented: false
---

# Story: 004-rule-tests

## User Story

**As a** future maintainer
**I want** the selection rule tested against the setting rather than a literal
**So that** the tests keep asserting the rule instead of a number that is no longer true

## Acceptance Criteria

- [ ] **Given** the three pgTAP files that assert the three-selection rule
      (`weekly_planning_test`, `weekly_planning_meal_history_test`,
      `account_model_rls_isolation_test`), **When** this story lands, **Then** each asserts the
      rule relative to the household's setting.
- [ ] **Given** a household at a **non-default** N, **When** tested, **Then** cases cover accepting
      the Nth pick and rejecting the N+1th. A suite that only ever tests 3 has not tested the
      feature.
- [ ] **Given** concurrent inserts, **When** tested, **Then** a case proves two racers cannot both
      land — the guarantee from `20260827002830`, re-proven with a variable bound.
- [ ] **Given** locking, **When** tested, **Then** cases cover locking at N, refusing below N, and
      refusing above N after the setting was lowered.
- [ ] **Given** the meal-history trigger, **When** tested, **Then** a case asserts it writes one row
      per selection at a non-default N — confirming it was genuinely N-agnostic all along.

## Technical Notes

- Existing assertions should be **updated, not deleted**. A rule that changed shape still needs its
  old guarantees proven; deleting an assertion is how a regression gets a clean run.
- The project already runs a pgTAP suite (358 tests as of v0.11.0) including a clean-slate reset.

## Dependencies

### Requires

- 002-selection-cap-honours-setting
- 003-lock-honours-setting

### Enables

- None

## Out of Scope

- Component tests for the client sites (unit 002's story)
