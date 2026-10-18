---
id: 080-line-merging
unit: 001-line-merging
intent: 023-shopping-list-consolidation
type: simple-construction-bolt
status: complete
stories:
  - 001-prep-notes-dont-split-a-line
  - 002-one-amount-per-unit
  - 003-plain-label
created: '2026-09-24T14:56:10Z'
started: '2026-09-24T15:00:52Z'
completed: '2026-09-24T16:55:26Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-24T15:01:54Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-24T15:46:31Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-24T16:55:26Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 081-merged-line-aisle
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 0
  testing_scope: 2
---

# Bolt: 080-line-merging

## Objective

One line per grocery: prep notes stop splitting lines, and each unit's total sits side by side.

## Why `simple-construction-bolt`

A pure function and its formatter. Frontend only, no schema change (NFR-1), and it stays within one
aggregate.

## What matters here

Precision. The look-alike pairs (NFR-2) and the shuffled-input test (NFR-3) are the proof, and each
must be shown failing against the old key before it's accepted. **Don't release this bolt without
081**: on its own, a merged line can lose its aisle.

## Verification

Unit tests on `aggregate.ts` and `format.ts`. Then the household's own week in a browser: the list
should be shorter, with nothing missing.
