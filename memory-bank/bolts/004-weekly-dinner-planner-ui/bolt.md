---
id: 004-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 003-pick-three-dinners
  - 004-editable-until-locked
created: '2026-08-26T17:31:13Z'
started: '2026-08-26T21:35:00Z'
completed: '2026-08-26T21:47:58Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-26T21:40:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-26T21:45:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-26T21:47:58Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 003-weekly-dinner-planner-ui
  - 002-weekly-planning
enables_bolts:
  - 005-weekly-dinner-planner-ui
requires_units:
  - 002-weekly-planning
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 004-weekly-dinner-planner-ui

## Overview

The pick-3 selection flow: choosing up to 3 dinners, with each pick persisted immediately, freely editable until the shopping list is copied and the plan locks.

## Objective

Let the wife go from browsing to a live, continuously-saved weekly plan she can freely revise, with clear validation and a clean read-only view once the plan is locked.

## Stories Included

- **003-pick-three-dinners**: Pick three dinners (Must)
- **004-editable-until-locked**: Editable until locked (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → `implementation-plan.md`
- ✅ **2. Implement**: Complete → Source code + `implementation-walkthrough.md`
- ✅ **3. Test**: Complete → `test-walkthrough.md`

## Dependencies

### Requires
- **003-weekly-dinner-planner-ui** (Required): Builds on the catalog view
- **002-weekly-planning** (Required): Needs the weekly-plan schema + max-3/lock enforcement to persist against

### Enables
- 005-weekly-dinner-planner-ui (shopping list is generated once a plan has 3 selections)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [ ] Code reviewed

## Notes

Client-side "max 3" validation here is a UX convenience only — must not be relied on as the sole enforcement (the DB triggers from bolt 002-weekly-planning are the real guarantee).

**Revised 2026-08-26**: no separate "confirm" step anymore — picks persist immediately and stay editable until the shopping list is copied (bolt 005), which is what locks the plan. See `inception-log.md` Scope Changes.
