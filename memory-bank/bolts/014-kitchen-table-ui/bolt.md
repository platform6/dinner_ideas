---
id: 014-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: complete
stories:
  - 001-design-token-foundation
  - 002-icon-vocabulary
created: '2026-08-27T09:30:00Z'
started: '2026-08-27T09:40:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-27T09:45:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-27T10:00:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-27T10:10:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 015-kitchen-table-ui
  - 016-kitchen-table-ui
  - 017-kitchen-table-ui
  - 018-kitchen-table-ui
  - 019-kitchen-table-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 0
  testing_scope: 1
completed: '2026-08-27T22:15:39Z'
---

# Bolt: 014-kitchen-table-ui

## Overview

Foundation bolt: drops in the design handoff's `theme.ts` and `icons.tsx`, wires up fonts and `ChakraProvider`, and recolors the PWA icons. Blocks every other bolt in this unit.

## Objective

Establish the "Kitchen Table" design tokens and icon vocabulary before any screen restyle begins.

## Stories Included

- **001-design-token-foundation**: Design token foundation (Must)
- **002-icon-vocabulary**: Icon vocabulary (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan**
- [ ] **2. Implement**
- [ ] **3. Test**

## Dependencies

### Requires

- None — first bolt in this intent

### Enables

- **015, 016, 017, 018, 019-kitchen-table-ui**: Every other bolt in this unit builds on the theme/icons this bolt establishes

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Cross-intent dependency (not expressible in `requires_bolts`): this intent restyles `001-weekly-dinner-planner`'s existing frontend, which is fully complete. No bolt in that intent needs to change for this one to proceed.
