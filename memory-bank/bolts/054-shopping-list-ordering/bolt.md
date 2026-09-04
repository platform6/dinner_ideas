---
id: 054-shopping-list-ordering
unit: 003-shopping-list-ordering
intent: 010-grocery-store-location-model
type: simple-construction-bolt
status: planned
stories:
  - 001-shopping-list-sort-by-location
  - 002-shopping-list-ordering-tests
created: '2026-09-04T14:30:00Z'
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts:
  - 051-location-item-model
enables_bolts: []
requires_units: []
blocks: false

complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 054-shopping-list-ordering

## Overview

Swap the shopping-list group-ordering sort key from `category → grocery_store_row.position`
to each ingredient's resolved `Item → Location` position. Independent of unit 2 — can build
in parallel once unit 1's cutover (051) lands.

## Objective

Prove the sort key change is equivalent for already-configured households and preserves the
unlocated-last-alphabetical fallback.

## Stories Included

- **001-shopping-list-sort-by-location**: the sort-key swap (Must)
- **002-shopping-list-ordering-tests**: updated tests + cutover equivalence fixture (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/shopping-list/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 051-location-item-model (the resolution query + a completed cutover to test equivalence
  against)

### Enables

- Intent complete for this unit; ready alongside 053 for Operations

## Success Criteria

- [ ] Group order follows resolved Location position; unassigned last, alphabetically
- [ ] `buildShoppingList` aggregation unchanged; only the sort key changed
- [ ] Equivalence fixture proves no regression for a configured household
- [ ] Full suite green; `tsc -b`, `eslint`, `vite build` clean

## Notes

Smallest, lowest-uncertainty bolt of the intent — a pure sort-key swap with a clear
equivalence bar.
