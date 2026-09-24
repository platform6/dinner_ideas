---
id: 082-empty-aisle-toggle
unit: 003-empty-aisle-toggle
intent: 023-shopping-list-consolidation
type: simple-construction-bolt
status: planned
stories:
  - 001-empty-aisles-tucked-away
created: '2026-09-24T14:56:10Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 2
  max_dependencies: 0
  testing_scope: 2
---

# Bolt: 082-empty-aisle-toggle

## Objective

Store setup's walking path hides empty aisles behind a "Show N empty aisles" toggle.

## Why `simple-construction-bolt`

One page, display state only, no schema change (NFR-1).

## What matters here

It's cuttable (`Should`) and independent of 080–081, so it can be built in any order. The uncertain
part is reorder: with aisles hidden, "move earlier" must land before the previous _visible_ aisle.

## Verification

Page tests for hiding, revealing, a newly added aisle, and reordering past a hidden aisle. Then the
household's store in a browser at phone width.
