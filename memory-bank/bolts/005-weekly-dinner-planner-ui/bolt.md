---
id: 005-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 005-generate-shopping-list
  - 006-copy-shopping-list-to-clipboard
created: '2026-08-26T17:31:13Z'
started: '2026-08-26T21:50:17Z'
completed: '2026-08-26T22:08:07Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-26T21:56:19Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-26T22:00:47Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-26T22:08:07Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 004-weekly-dinner-planner-ui
enables_bolts:
  - 006-weekly-dinner-planner-ui
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 005-weekly-dinner-planner-ui

## Overview

The core payoff feature: turning a weekly plan's 3 picks into a single, merged, category-grouped shopping list that copies cleanly to a text message — and locks the plan the moment it's copied.

## Objective

Implement and thoroughly unit-test the ingredient aggregation logic (the riskiest piece of business logic in the app), plus the grouped display and clipboard copy.

## Stories Included

- **005-generate-shopping-list**: Generate shopping list (Must)
- **006-copy-shopping-list-to-clipboard**: Copy shopping list to clipboard (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → `implementation-plan.md`
- ✅ **2. Implement**: Complete → Source code + `implementation-walkthrough.md`
- ✅ **3. Test**: Complete → `test-walkthrough.md`

## Dependencies

### Requires
- **004-weekly-dinner-planner-ui** (Required): Needs a plan with exactly 3 selections to generate a list from

### Enables
- 006-weekly-dinner-planner-ui

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [ ] Code reviewed

## Notes

Per `coding-standards.md`, the ingredient merge/aggregation function is exactly the kind of logic that should get real unit test coverage (name normalization, unit-mismatch handling) even though the rest of the app skips heavy testing.

**Revised 2026-08-26**: copying the shopping list now also locks the plan (calls `002-weekly-planning`'s lock RPC) — previously the plan locked earlier, at initial confirmation. See `inception-log.md` Scope Changes.

**Revised again 2026-08-26 during this bolt's Stage 1 (Plan)**: copy and lock decoupled — a checkbox ("Also lock this week's plan," checked by default) now controls whether copying also locks, rather than every copy locking automatically. See `construction-log.md` Replanning History and story `006-copy-shopping-list-to-clipboard`.
