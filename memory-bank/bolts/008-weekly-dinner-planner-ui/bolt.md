---
id: 008-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 010-cooking-view
created: '2026-08-26T19:43:10Z'
started: '2026-08-26T23:03:51Z'
completed: '2026-08-26T23:40:07Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-26T23:27:30Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-26T23:31:20Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-26T23:40:07Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 004-weekly-dinner-planner-ui
  - 007-dinner-catalog
enables_bolts: []
requires_units:
  - 001-dinner-catalog
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 008-weekly-dinner-planner-ui

## Overview

The cooking view: a dedicated page showing the current plan's 3 dinners with ordered, step-by-step instructions.

## Objective

Let the wife follow clear steps while actually cooking, on its own page/route — separate from the shopping list — added late in the plan after FR-8 was introduced during Construction.

## Stories Included

- **010-cooking-view**: Cooking view (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → `implementation-plan.md`
- ✅ **2. Implement**: Complete → Source code + `implementation-walkthrough.md`
- ✅ **3. Test**: Complete → `test-walkthrough.md`

## Dependencies

### Requires
- **004-weekly-dinner-planner-ui** (Required): Needs the current plan's selected dinners
- **007-dinner-catalog** (Required): Needs real `dinner_steps` data to display

### Enables
- None (last planned bolt in the intent, unless further scope changes occur)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [ ] Code reviewed

## Notes

Added during Construction (originally not part of the intent) after the user requested a cooking view — see `inception-log.md` Scope Changes. Can execute any time after both dependencies complete; doesn't strictly require bolts 005/006 to exist first, though it will likely land after them in practice.
