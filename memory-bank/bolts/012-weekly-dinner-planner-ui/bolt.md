---
id: 012-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 011-catalog-card-expandable-details
  - 012-tag-management-ui
created: '2026-08-27T01:00:00Z'
started: '2026-08-27T03:30:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-27T03:40:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-27T04:00:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-27T04:10:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 009-dinner-catalog
enables_bolts: []
requires_units:
  - 001-dinner-catalog
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-08-27T18:57:21Z'
---

# Bolt: 012-weekly-dinner-planner-ui

## Overview

Adds an expandable "Details" section to each catalog card (ordered cooking steps + full ingredient list), and moves tag display/add/remove into that same section, replacing the old Rosie-approved badge/filter.

## Objective

Let the wife see a dinner's steps/ingredients without picking it, and manage her own tags — FR-9 and FR-10, requested after using the deployed app.

## Stories Included

- **011-catalog-card-expandable-details**: Catalog card expandable details (Must)
- **012-tag-management-ui**: Tag management UI (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan**
- [ ] **2. Implement**
- [ ] **3. Test**

## Dependencies

### Requires

- **009-dinner-catalog** (Required): Needs the `tags`/`dinner_tags` schema before the tag UI can read/write it

### Enables

- None (last-planned UI bolt for this pair of stories)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Blocked (`blocks: true`) until `009-dinner-catalog` completes — the tag UI has nothing to read/write against otherwise. The card-details (steps/ingredients) half of this bolt has no such dependency and could theoretically start first if useful to split further during Construction.
