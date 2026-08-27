---
id: 013-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: planned
stories:
  - 013-week-navigation-view
  - 014-grocery-store-config-page
created: '2026-08-27T01:00:00Z'
requires_bolts:
  - 010-weekly-planning
  - 011-grocery-store-config
enables_bolts: []
requires_units:
  - 002-weekly-planning
  - 004-grocery-store-config
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 013-weekly-dinner-planner-ui

## Overview

Adds the ◀ / ▶ past/future week navigation view (with eaten-vs-current distinction) and the grocery store row configuration page.

## Objective

Let the wife browse week history Blue Apron–style (FR-11) and configure her store's aisle layout so the shopping list matches it (FR-12) — both requested after using the deployed app.

## Stories Included

- **013-week-navigation-view**: Week navigation view (Should)
- **014-grocery-store-config-page**: Grocery store config page (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan**
- [ ] **2. Implement**
- [ ] **3. Test**

## Dependencies

### Requires

- **010-weekly-planning** (Required): Needs `meal_history` for week navigation
- **011-grocery-store-config** (Required): Needs the store-rows schema + reorder function for the config page

### Enables

- None (last-planned bolt for this pair of stories)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Blocked (`blocks: true`) until both `010-weekly-planning` and `011-grocery-store-config` complete. The two stories are otherwise independent of each other and could be split into separate bolts during Construction if that's more convenient. Explicitly does not touch the pick-3 flow's real-time feel — that's deferred to a future dedicated UX Inception pass.
