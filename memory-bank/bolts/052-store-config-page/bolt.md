---
id: 052-store-config-page
unit: 002-store-config-page
intent: 010-grocery-store-location-model
type: simple-construction-bolt
status: planned
stories:
  - 001-similarity-algorithm
  - 002-walking-path-list
  - 006-delete-location-confirm
created: '2026-09-04T14:30:00Z'
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts:
  - 051-location-item-model
enables_bolts:
  - 053-store-config-page
requires_units: []
blocks: false

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 052-store-config-page

## Overview

The similarity engine plus the walking-path list itself: rows, add/rename/reorder/remove, and
the one destructive confirm on the page.

## Objective

Replace the two-panel layout with the unified ordered list and give it a working similarity
engine to feed the assign flow (bolt 053).

## Stories Included

- **001-similarity-algorithm**: client-side scoring, tuned for precision (Must)
- **002-walking-path-list**: location rows, lifecycle, reorder (Must)
- **006-delete-location-confirm**: the one destructive confirm on the page (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/store-config/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 051-location-item-model (the tables, resolution query, reorder RPC)

### Enables

- 053-store-config-page (the assign flow mounts on top of this list)

## Success Criteria

- [ ] One ordered list, sections/aisles as peers, no two-panel layout remains
- [ ] Add/rename/reorder/remove all work; reorder calls `reorder_location`
- [ ] Delete-with-items shows the count-stated confirm; delete-empty needs none
- [ ] Similarity algorithm passes its false-friend-family test cases
- [ ] `tsc -b`, `eslint`, `vite build` clean

## Notes

`similarity.ts` is a pure function — land and unit-test it in isolation before wiring it into
the assign flow next bolt.
