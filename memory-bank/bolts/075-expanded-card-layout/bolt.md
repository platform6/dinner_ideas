---
id: 075-expanded-card-layout
unit: 003-expanded-card-layout
intent: 019-ui-correctness-fixes
type: simple-construction-bolt
status: complete
stories:
  - 001-expanded-card-spans-row
created: '2026-09-17T15:57:07Z'
started: '2026-09-17T16:39:30Z'
completed: '2026-09-17T16:59:07Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-17T16:40:55Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-17T16:42:36Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-17T16:59:07Z'
    artifact: test-walkthrough.md
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
