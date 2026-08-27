---
id: 016-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: planned
stories:
  - 006-login-restyle
  - 007-catalog-dinner-card-restyle
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

# Bolt: 016-kitchen-table-ui

## Overview

Restyles the Login screen and the Catalog/DinnerCard screen, including the `rosie-approved` heart display rule and the expandable-details section's new icons.

## Objective

Land the first two fully-restyled screens — Login (self-contained) and Catalog (the app's landing page, and the most visually complex screen in the handoff).

## Stories Included

- **006-login-restyle**: Login restyle (Must)
- **007-catalog-dinner-card-restyle**: Catalog & dinner card restyle (Must)

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
- **015-kitchen-table-ui** (Required): Story `007` needs the chip row from story `004`

### Enables

- None

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Story `005` (suppress overflow menu) touches the same `DinnerCard.tsx` file as story `007` — even though `005` lives in bolt `015`, sequence the actual PR/commit for both card changes together to avoid a confusing intermediate diff.
