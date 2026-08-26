---
id: 006-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 007-variety-indicator
  - 008-pwa-install-offline
created: '2026-08-26T17:31:13Z'
started: '2026-08-26T22:11:00Z'
completed: '2026-08-26T22:34:51Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-26T22:19:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-26T22:27:38Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-26T22:34:51Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 005-weekly-dinner-planner-ui
  - 002-weekly-planning
enables_bolts: []
requires_units:
  - 002-weekly-planning
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 006-weekly-dinner-planner-ui

## Overview

Final polish bolt: surfacing selection-history "variety" cues in the catalog, and making the app installable/usable offline as a PWA.

## Objective

Round out the app with the two "Should"-priority enhancements: nudging toward variety and reliable installable/offline behavior for phone use.

## Stories Included

- **007-variety-indicator**: Variety indicator (Should)
- **008-pwa-install-offline**: PWA install & offline (Should)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → `implementation-plan.md`
- ✅ **2. Implement**: Complete → Source code + `implementation-walkthrough.md`
- ✅ **3. Test**: Complete → `test-walkthrough.md`

## Dependencies

### Requires
- **005-weekly-dinner-planner-ui** (Required): Shopping list is what gets cached offline
- **002-weekly-planning** (Required): Variety indicator reads the last-chosen query

### Enables
- None directly (bolt 008-weekly-dinner-planner-ui, added later for the cooking view, does not depend on this bolt)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [ ] Code reviewed

## Notes

Highest uncertainty in the plan — PWA/service-worker offline caching behavior is the least familiar territory and may need some spiking during Stage 1 (Plan).
