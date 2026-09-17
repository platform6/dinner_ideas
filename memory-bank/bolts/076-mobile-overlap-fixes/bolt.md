---
id: 076-mobile-overlap-fixes
unit: 004-mobile-overlap-fixes
intent: 019-ui-correctness-fixes
type: simple-construction-bolt
status: complete
stories:
  - 001-footer-never-hides-content
  - 002-card-menu-clears-title
created: '2026-09-17T16:01:11Z'
started: '2026-09-17T17:00:23Z'
completed: '2026-09-17T17:44:08Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-17T17:27:07Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-17T17:39:33Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-17T17:44:08Z'
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

# Bolt: 076-mobile-overlap-fixes

## Objective

On a phone, the shopping list's footer and a card's action menu stop hiding what the cook needs to read.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), and no aggregate boundary is crossed.

## What matters here

Cuttable (`Should`). **Reproduce both at phone width in the running app before changing anything.**
The review described the footer as fixed; it is sticky, so confirm what actually overlaps. jsdom has
no layout, so tests can pin behaviour such as scroll padding and placement props, but the proof is a
phone-width screenshot.
