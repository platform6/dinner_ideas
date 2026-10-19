---
id: 085-tap-bar-to-open
unit: 001-tap-bar-to-open
intent: 027-tap-row-to-expand
type: simple-construction-bolt
status: complete
stories:
  - 001-tap-the-bar
created: '2026-10-19T10:20:41Z'
started: '2026-10-19T11:12:05Z'
completed: '2026-10-19T12:58:17Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-19T11:42:24Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-19T12:02:55Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-19T12:58:17Z'
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

# Bolt: 085-tap-bar-to-open

## Objective

On This week, tapping a picked dinner's bar opens or closes it, as the expand icon does.

## Why `simple-construction-bolt`

One component, front end only, no data change.

## What matters here

- The expand icon must toggle once, not twice, and remove must not toggle at all
- On desktop the details stay outside the clickable part, so taps inside them don't close the cards

## Verification

Component tests at 390px and 1280px. The tap target in a real browser is checked in the release
smoke test, along with v0.20.0's checks.

## Stories

- `001-tap-the-bar`
