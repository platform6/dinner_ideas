---
id: 010-weekly-planning
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
type: ddd-construction-bolt
status: planned
stories:
  - 004-meal-history-schema
created: '2026-08-27T01:00:00Z'
requires_bolts: []
enables_bolts:
  - 013-weekly-dinner-planner-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 010-weekly-planning

## Overview

Adds a `meal_history` table written explicitly when a plan locks, giving past weeks a durable "this was eaten" record instead of inferring it from `locked_at` + date.

## Objective

Support FR-11's past-weeks view with real history data, added post-deployment after the user asked for browsable week history modeled on Blue Apron.

## Stories Included

- **004-meal-history-schema**: Meal history schema (Should)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- [ ] **1. Domain Model**
- [ ] **2. Technical Design**
- [ ] **3. Test Report**
- [ ] **4. Implement**
- [ ] **5. Verify**

## Dependencies

### Requires

- None — additive migration; hooks into the existing `lock_weekly_plan` RPC

### Enables

- **013-weekly-dinner-planner-ui**: Needs `meal_history` for the past/future week navigation view

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Open question carried into this bolt (see `requirements.md` Open Questions): confirm plan-lock is the right moment to write `meal_history` rows before finalizing the domain model — flag this explicitly at the start of Stage 1 (Domain Model) rather than assuming.
