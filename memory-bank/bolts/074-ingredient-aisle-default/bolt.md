---
id: 074-ingredient-aisle-default
unit: 002-ingredient-aisle-default
intent: 019-ui-correctness-fixes
type: simple-construction-bolt
status: planned
stories:
  - 001-no-default-aisle
  - 002-aisle-from-household-history
created: '2026-09-17T15:57:07Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 074-ingredient-aisle-default

## Objective

New ingredient lines stop defaulting to Produce, and known ingredients get the household's own aisle.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), and no aggregate boundary is crossed.

## What matters here

The draft contract changes (`category` may be unset) and each line gains provenance. **The acceptance criteria that matter most are the negative ones**: nothing ever changes a chosen or imported aisle. Story 001 lands before 002 inside the bolt.
