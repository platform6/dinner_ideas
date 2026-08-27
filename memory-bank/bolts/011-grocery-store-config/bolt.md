---
id: 011-grocery-store-config
unit: 004-grocery-store-config
intent: 001-weekly-dinner-planner
type: ddd-construction-bolt
status: planned
stories:
  - 001-store-rows-schema
  - 002-reorder-shopping-list-by-rows
created: '2026-08-27T01:00:00Z'
requires_bolts: []
enables_bolts:
  - 013-weekly-dinner-planner-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 011-grocery-store-config

## Overview

Core schema and reorder logic for the new grocery-store-config unit: user-defined, ordered store rows, category → row assignment, and a pure function that resorts shopping-list groups by that configuration.

## Objective

Let the shopping list match how the wife actually walks her store, instead of a fixed alphabetical order — a brand-new domain concept added post-deployment (FR-12).

## Stories Included

- **001-store-rows-schema**: Store rows schema (Must)
- **002-reorder-shopping-list-by-rows**: Reorder shopping list by rows (Must)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- [ ] **1. Domain Model**
- [ ] **2. Technical Design**
- [ ] **3. Test Report**
- [ ] **4. Implement**
- [ ] **5. Verify**

## Dependencies

### Requires

- None — new, independent unit; references ingredient `category` strings conceptually, not via FK

### Enables

- **013-weekly-dinner-planner-ui**: Needs this bolt's schema + reorder function for the config page and shopping list

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

First bolt for the new `004-grocery-store-config` unit. Category-level granularity only this round (no per-ingredient override) — see unit-brief Constraints and `requirements.md` Open Questions.
