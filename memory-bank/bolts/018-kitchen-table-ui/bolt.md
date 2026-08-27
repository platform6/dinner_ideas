---
id: 018-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: planned
stories:
  - 010-cooking-view-restyle
  - 011-suppressed-view-restyle
created: '2026-08-27T09:30:00Z'
requires_bolts:
  - 014-kitchen-table-ui
  - 015-kitchen-table-ui
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 018-kitchen-table-ui

## Overview

Restyles Cooking View, and fills in the Suppressed route (created in bolt `015`) with its own restyled content.

## Objective

Land the last two of the original 6 documented screens.

## Stories Included

- **010-cooking-view-restyle**: Cooking view restyle (Must)
- **011-suppressed-view-restyle**: Suppressed view restyle (Must)

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
- **015-kitchen-table-ui** (Required): Story `011` fills in the route story `004` created

### Enables

- None

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
