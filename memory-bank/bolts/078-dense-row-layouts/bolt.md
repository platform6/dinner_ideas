---
id: 078-dense-row-layouts
unit: 002-dense-row-layouts
intent: 024-mobile-ergonomics
type: simple-construction-bolt
status: complete
stories:
  - 001-remove-step-is-not-a-mis-tap
  - 002-store-row-shows-its-name
created: '2026-09-18T13:10:36Z'
started: '2026-09-18T14:34:05Z'
completed: '2026-09-18T17:55:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-18T14:35:46Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-18T14:40:08Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-18T17:54:59Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 077-touch-target-size
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 078-dense-row-layouts

## Objective

The step row and the Store setup row stop crowding what the user came for.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), no aggregate boundary crossed.

## What matters here

Two independent re-flows. The Store setup row is itself a tap target with buttons inside that must not trigger it — that behaviour has to survive. Needs bolt 077 first, or the buttons get laid out at the wrong size.

## Verification

jsdom has no layout (NFR-3), so unit tests pin what is declared — theme values, markup, labels — and
**the proof is a browser at phone width and at 1024px**. That check is part of the bolt.
