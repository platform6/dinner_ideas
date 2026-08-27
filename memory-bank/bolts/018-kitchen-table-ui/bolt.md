---
id: 018-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: planned
stories:
  - 010-cooking-view-restyle
created: '2026-08-27T09:30:00Z'
requires_bolts:
  - 014-kitchen-table-ui
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 018-kitchen-table-ui

## Overview

Restyles Cooking View — the last of the original 6 documented screens.

**Replanned 2026-08-27** (during bolt `015`'s Stage 1 Plan): story `011` (Suppressed view) was pulled forward into bolt `015`, since it landed alongside the route `015` creates rather than as a separate stub-then-replace step. This bolt now only carries `010`.

## Objective

Land the last of the original 6 documented screens.

## Stories Included

- **010-cooking-view-restyle**: Cooking view restyle (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan**
- [ ] **2. Implement**
- [ ] **3. Test**

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

None.
