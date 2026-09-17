---
id: 073-copy-corrections
unit: 001-copy-corrections
intent: 019-ui-correctness-fixes
type: simple-construction-bolt
status: complete
stories:
  - 001-plan-copy-reads-dinner-count
  - 002-one-name-for-add-a-dinner
created: '2026-09-17T15:57:07Z'
started: '2026-09-17T16:07:49Z'
completed: '2026-09-17T16:18:54Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-17T16:11:36Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-17T16:15:45Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-17T16:18:54Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 073-copy-corrections

## Objective

Make the plan page's counts and the add button's name agree with the app.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), and no aggregate boundary is crossed.

## What matters here

Two strings and a doc comment. The real deliverable is the tests with N ≠ 3: the last sweep missed these because every test used N = 3.
