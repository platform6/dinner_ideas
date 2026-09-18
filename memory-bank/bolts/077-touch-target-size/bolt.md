---
id: 077-touch-target-size
unit: 001-touch-target-size
intent: 024-mobile-ergonomics
type: simple-construction-bolt
status: planned
stories:
  - 001-sm-is-44-on-a-phone
  - 002-no-screen-reflows-badly
created: '2026-09-18T13:10:36Z'
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
  testing_scope: 3
---

# Bolt: 077-touch-target-size

## Objective

Every tapped control reaches 44×44px on a phone, and no screen breaks doing it.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), no aggregate boundary crossed.

## What matters here

One line of theme, then the work: every screen in story 002 looked at on a phone and at 1024px. 78 controls inherit this size. **The bolt is the check, not the edit.**

## Verification

jsdom has no layout (NFR-3), so unit tests pin what is declared — theme values, markup, labels — and
**the proof is a browser at phone width and at 1024px**. That check is part of the bolt.
