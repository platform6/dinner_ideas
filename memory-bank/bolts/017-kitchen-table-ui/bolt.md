---
id: 017-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: complete
stories:
  - 008-this-week-restyle-week-nav
  - 009-shopping-list-restyle
created: '2026-08-27T09:30:00Z'
started: '2026-08-27T13:00:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-27T13:00:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-27T13:20:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-27T13:30:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 014-kitchen-table-ui
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-08-27T23:09:04Z'
---

# Bolt: 017-kitchen-table-ui

## Overview

Restyles This Week (incl. the week-navigation controls added in the prior enhancement round) and Shopping List.

## Objective

Land the plan → shop half of the weekly flow's restyle.

## Stories Included

- **008-this-week-restyle-week-nav**: This week restyle + week nav (Must)
- **009-shopping-list-restyle**: Shopping list restyle (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. Plan**
- [x] **2. Implement**
- [x] **3. Test**

## Dependencies

### Requires

- **014-kitchen-table-ui** (Required): Theme/icons

### Enables

- None

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Independent of bolt `015`/`016` — can run in parallel with them once `014` is done, if useful to split work that way.
