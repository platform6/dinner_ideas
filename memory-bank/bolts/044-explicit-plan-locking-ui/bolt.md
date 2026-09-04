---
id: 044-explicit-plan-locking-ui
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
type: simple-construction-bolt
status: complete
stories:
  - 004-shopping-list-lock-decoupled
  - 005-not-locked-yet-nudge
  - 006-lock-flow-tests
created: '2026-09-03T22:55:00Z'
started: '2026-09-04T00:45:00Z'
completed: '2026-09-04T00:35:41Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-04T00:45:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-04T00:52:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 043-explicit-plan-locking-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 044-explicit-plan-locking-ui

## Overview

Remove all locking wiring from `ShoppingListPage`, make Copy a pure copy, add the
non-blocking "not locked yet" note, and land the consolidated new/updated test coverage
across both pages.

## Objective

Finish the decoupling: the shopping list no longer locks anything, the user is gently pointed
to the `/plan` lock action instead, and the whole lock flow is regression-guarded.

## Stories Included

- **004-shopping-list-lock-decoupled**: strip lock checkbox / state / mutation; plain
  "Copied!" (Must)
- **005-not-locked-yet-nudge**: non-blocking pointer to `/plan` for an unlocked 3-pick week
  (Should)
- **006-lock-flow-tests**: `LockWeekControl.test.tsx` (new), `PlanPage.test.tsx` +
  `ShoppingListPage.test.tsx` (updated), suite green (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/shopping-list/, src/features/weekly-plan/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 043-explicit-plan-locking-ui (shared `uiIcons.lock`; the locked-view + confirm exist to
  test against)

### Enables

- Intent `011-planning-week-rollover` (locking is now a clear standalone action)

## Success Criteria

- [ ] `ShoppingListPage` has no `useLockPlan` import; `handleCopy` only copies; success text
      is "Copied!"; both responsive layouts render and copy
- [ ] The "not locked yet" note shows only for an unlocked 3-pick current-week plan; copy
      still succeeds
- [ ] New/updated tests pass; `weekly-plan` / `shopping-list` / `cooking-view` suites green
- [ ] `tsc -b`, `eslint`, `vite build` clean

## Notes

Watch the `ShoppingListPage` regression surface — existing copy tests assert the lock-branched
success strings; those assertions are intentionally replaced here.
