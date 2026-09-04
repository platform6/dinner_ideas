---
id: 053-store-config-page
unit: 002-store-config-page
intent: 010-grocery-store-location-model
type: simple-construction-bolt
status: planned
stories:
  - 003-assign-flow
  - 004-unassigned-section
  - 005-first-run-and-desktop
  - 007-store-config-tests
created: '2026-09-04T14:30:00Z'
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts:
  - 052-store-config-page
enables_bolts: []
requires_units: []
blocks: false

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 053-store-config-page

## Overview

The placement flow: the assign bottom sheet (suggestions, picker, unlink), the unassigned
section, first-run and desktop treatments, and the consolidated test pass for the whole page.

## Objective

Finish the page: placing an ingredient — with or without a suggestion — is a complete, tested
flow, and the page reads correctly with nothing configured or at desktop width.

## Stories Included

- **003-assign-flow**: bottom sheet — resolution line, suggestions, picker, unlink (Must)
- **004-unassigned-section**: "Not on the path yet" (Must)
- **005-first-run-and-desktop**: empty state + desktop layout (Should)
- **007-store-config-tests**: consolidated coverage across the whole unit (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/store-config/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 052-store-config-page (the list + similarity engine this flow mounts on)

### Enables

- Intent complete for this unit; ready alongside 054 for Operations

## Success Criteria

- [ ] Assign sheet: resolution line correct for all 3 states; suggestions one-tap
      accept/dismiss; picker always available; "Take it off the path" works; focus trap +
      Escape + focus return
- [ ] Unassigned section: default scope + full-catalog search + both empty states
- [ ] First-run + desktop states render correctly
- [ ] New/updated tests pass; full suite green; `tsc -b`, `eslint`, `vite build` clean

## Notes

Last bolt for unit 2. On completion, only unit 3 (independent, can run in parallel) remains
before intent `010` is ready for Operations.
