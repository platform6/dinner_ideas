---
id: 079-aisle-sheet-close
unit: 003-aisle-sheet-close
intent: 024-mobile-ergonomics
type: simple-construction-bolt
status: planned
stories:
  - 001-sheet-closes-visibly
created: '2026-09-18T13:10:36Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 077-touch-target-size
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 079-aisle-sheet-close

## Objective

The aisle sheet closes by an obvious control, and its last action clears the screen edge.

## Why `simple-construction-bolt`

Frontend only, no schema change (NFR-1), no aggregate boundary crossed.

## What matters here

Cuttable (`Should`). The drawer already closes on Escape and outside taps; this makes it visible. Watch the theme's 16px `CloseButton`.

## Verification

jsdom has no layout (NFR-3), so unit tests pin what is declared — theme values, markup, labels — and
**the proof is a browser at phone width and at 1024px**. That check is part of the bolt.
