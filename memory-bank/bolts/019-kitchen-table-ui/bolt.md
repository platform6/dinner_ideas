---
id: 019-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: planned
stories:
  - 012-store-config-restyle
created: '2026-08-27T09:30:00Z'
requires_bolts:
  - 014-kitchen-table-ui
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 019-kitchen-table-ui

## Overview

Restyles the Grocery Store Config page — the one screen with no pixel reference in the handoff, extrapolated from the established conventions.

## Objective

Bring the last (post-handoff) screen in line with the rest of the app.

## Stories Included

- **012-store-config-restyle**: Store config restyle (Should)

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

Lowest priority bolt in this intent (`Should`, not `Must`) — no pixel reference to match, only patterns to follow. Fine to defer if time-constrained.
