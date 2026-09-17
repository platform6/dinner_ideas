---
id: 075-expanded-card-layout
unit: 003-expanded-card-layout
intent: 019-ui-correctness-fixes
type: simple-construction-bolt
status: planned
stories:
  - 001-expanded-card-spans-row
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
  avg_complexity: 1
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 075-expanded-card-layout

## Objective

An expanded catalog card spans its row.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), and no aggregate boundary is crossed.

## What matters here

Cuttable (`Should`). Decide where `isExpanded` lives before touching styles. Verify at 1, 2 and 3 columns in the running app, not only in jsdom, which has no layout.
