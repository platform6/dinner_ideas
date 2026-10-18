---
id: 083-photo-slots-off
unit: 001-photo-slots-off
intent: 025-hide-photo-slots
type: simple-construction-bolt
status: complete
stories:
  - 001-photo-slots-switched-off
  - 002-cooking-view-keeps-its-icon
created: '2026-10-18T20:06:52Z'
started: '2026-10-18T20:12:32Z'
completed: '2026-10-18T20:23:40Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-18T20:13:25Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-18T20:14:58Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-18T20:23:40Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 083-photo-slots-off

## Objective

The three photo slots go behind one `SHOW_PHOTO_SLOTS` constant, set to `false`. The cooking view
keeps its cuisine icon in the meta row.

## Why `simple-construction-bolt`

Three components and a design note. Display only, with no schema change.

## What matters here

The constant has to restore the slots exactly as they render today, so the "on" path gets a test
too, not just "off". Bolt 082's `StoreConfigPage.tsx` is not touched.

## Verification

Component tests for both constant values on all three surfaces. Then catalog, cooking view and This
week (three-across) in a browser at 390px and at desktop width.

## Stories

- [ ] **001-photo-slots-switched-off**: the three slots are not rendered, behind one constant - Priority: Must
- [ ] **002-cooking-view-keeps-its-icon**: the cuisine icon moves into the meta row - Priority: Must
