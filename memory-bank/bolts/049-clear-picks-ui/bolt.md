---
id: 049-clear-picks-ui
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
type: simple-construction-bolt
status: complete
stories:
  - 003-catalog-mount-and-undo-bar
  - 004-in-flight-and-error-handling
  - 005-keyboard-and-a11y
  - 006-clear-picks-tests
created: '2026-09-04T02:36:10Z'
started: '2026-09-04T02:46:00Z'
completed: '2026-09-04T02:49:35Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-04T02:46:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-04T02:52:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 048-clear-picks-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 049-clear-picks-ui

## Overview

Compose the pieces into the full flow on `CatalogPage`: mount the control in the header, own
`clearedIds` + the undo bar, wire in-flight/error handling and the `selectionDisabled`
extension, land the focus/a11y flow, and the tests.

## Objective

Ship "Clear picks" end to end — guarded clear, persistent undo bar, keyboard-complete, with
`/plan` untouched.

## Stories Included

- **003-catalog-mount-and-undo-bar**: header placement, `clearedIds` state, the undo bar,
  dismiss rules (Must)
- **004-in-flight-and-error-handling**: `selectionDisabled` += clearing; error alerts;
  locked-plan hidden (Must)
- **005-keyboard-and-a11y**: focus to "Keep" / "Undo", `Escape`, `aria-live` (Must)
- **006-clear-picks-tests**: `ClearPicksControl.test.tsx` + `CatalogPage.test.tsx` extension +
  data-layer coverage (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/dinners/, src/features/weekly-plan/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 048-clear-picks-ui (the component + hooks it wires together)

### Enables

- (intent complete — ready for Operations)

## Success Criteria

- [ ] Control is the 2nd child of the header right stack; hides at 0 picks / locked; no header
      reflow
- [ ] Clear → grid empties on refetch, undo bar shows with singular/plural count; Undo
      restores in order and hides the bar; pick-another / navigate-away also hide it
- [ ] Pick cards disabled while clearing; clear/undo failures show the right alert
- [ ] Focus: open → "Keep"; `Escape` → back to trigger; cleared → "Undo"
- [ ] New + extended tests pass; full suite green; `tsc -b`, `eslint`, `vite build` clean;
      `PlanPage` unchanged

## Notes

`clearedIds` lives only in `CatalogPage` state — OQ-1 resolved "Undo does not survive
navigation". Undo-bar is guarded `clearedIds != null && !isLocked`.
