---
id: 048-clear-picks-ui
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
type: simple-construction-bolt
status: complete
stories:
  - 001-clear-picks-control
  - 002-clear-selections-hooks
created: '2026-09-04T02:36:10Z'
started: '2026-09-04T02:36:10Z'
completed: '2026-09-04T02:43:35Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-04T02:36:10Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-04T02:44:00Z'
    artifact: implementation-walkthrough.md
requires_bolts: []
enables_bolts:
  - 049-clear-picks-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 048-clear-picks-ui

## Overview

The building blocks: the `ClearPicksControl` component (quiet button → inline confirm pill)
and the data layer — `clearSelections` (one keyed `delete`) plus `useClearSelections` /
`useRestoreSelections`.

## Objective

Produce a tested `ClearPicksControl` and the two mutation hooks + API function that the
catalog wiring (bolt 049) will compose into the full clear/undo flow.

## Stories Included

- **001-clear-picks-control**: prop-driven component, three states, call-site terracotta fill
  (Must)
- **002-clear-selections-hooks**: `clearSelections(planId)` + `useClearSelections()` (returns
  removed ids in order) + `useRestoreSelections()` (sequential re-add) (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/weekly-plan/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- None (first bolt of the intent)

### Enables

- 049-clear-picks-ui (catalog mount + undo bar + a11y + tests)

## Success Criteria

- [ ] `ClearPicksControl` renders correct state for count 0 vs 1–3, idle vs confirming;
      "Clear all" → `onClear` once; `isClearing` spinner
- [ ] `clearSelections` = one `delete().eq('weekly_plan_id', …)`, throws on error, leaves the
      plan row
- [ ] `useClearSelections` returns removed dinner ids in order + invalidates the current-plan
      key; `useRestoreSelections` re-adds sequentially
- [ ] `tsc -b`, `eslint`, `vite build` clean; `weekly-plan` suite green

## Notes

Model `ClearPicksControl` on `LockWeekControl` (bolt 043) — same three-state shape and a11y
contract. This intent is the sibling the two controls were designed to match.
