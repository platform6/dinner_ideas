---
id: 084-picked-dinner-details
unit: 001-picked-dinner-details
intent: 026-ingredients-in-week-and-cook
type: simple-construction-bolt
status: complete
stories:
  - 001-shared-ingredient-and-step-lists
  - 002-this-week-expands
  - 003-cook-shows-ingredients
created: '2026-10-18T22:15:19Z'
started: '2026-10-18T22:25:55Z'
completed: '2026-10-19T00:30:48Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-18T22:27:32Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-18T22:31:29Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-19T00:30:48Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 084-picked-dinner-details

## Objective

The catalog's ingredient and step lists become shared components. This week can expand a picked
dinner to show them, and the Cook tab's expand adds ingredients above its steps.

## Why `simple-construction-bolt`

Front end only, with one widened select and no schema change. Three components change, and two are
new.

## What matters here

- The catalog's Details mustn't change. Its existing tests are the guard
- This week's two layouts open differently: all together on desktop, one at a time on phone
- The phone row has to fit an expand button next to the remove button at 390px

## Verification

Component tests for each story, with desktop at 1280px. Then This week (phone and desktop, current
and past week) and the Cook tab in a browser at 390px and at desktop width.

## Stories

- [ ] **001-shared-ingredient-and-step-lists**: the catalog's lists become shared components - Priority: Should
- [ ] **002-this-week-expands**: a picked dinner on This week opens to its ingredients and steps - Priority: Must
- [ ] **003-cook-shows-ingredients**: a Cook tab row opens to ingredients above its steps - Priority: Must
