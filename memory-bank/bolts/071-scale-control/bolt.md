---
id: 071-scale-control
unit: 002-scale-on-review
intent: 018-serving-scale-and-removal
type: simple-construction-bolt
status: planned
stories:
  - 003-scale-control-on-review
created: '2026-09-11T16:24:16Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 070-extraction-reports-servings
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 071-scale-control

## Objective

Offer the scaling. Never apply it uninvited.

## Why `simple-construction-bolt`

A control on an existing form, calling a module that already exists by then. Pure UI wiring.

## What matters here

**FR-4 is the load-bearing requirement.** Nothing is scaled unless the user asks. That single
default is what resolves the household-versus-dish tension: a tray bake imports as written and the
user simply does not press the button.

A future change will be tempted to scale automatically "because the household size is right there".
It must not. Consider a test that asserts quantities are untouched on arrival.

**Name both numbers.** "Scale from 8 to 5" tells the user what will happen; "Scale to household
size" does not.

**The no-count and range cases need their own paths** — one cannot offer scaling at all, the other
needs the user to supply the base.

## Definition of Done

- The control names both numbers and applies scaling visibly
- Applying is undoable without re-importing
- A ranged source asks the user for the base; a countless source explains why scaling is unavailable
- Saving without touching the control saves the source's quantities
- `tsc -b`, `eslint`, `vitest` green
