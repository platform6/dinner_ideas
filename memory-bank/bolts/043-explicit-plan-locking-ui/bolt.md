---
id: 043-explicit-plan-locking-ui
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
type: simple-construction-bolt
status: complete
stories:
  - 001-lock-in-this-week-action
  - 002-inline-lock-confirm
  - 003-locked-view-reword
created: '2026-09-03T22:55:00Z'
started: '2026-09-04T00:23:20Z'
completed: '2026-09-04T00:31:26Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-04T00:23:20Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-04T00:35:00Z'
    artifact: implementation-walkthrough.md
requires_bolts: []
enables_bolts:
  - 044-explicit-plan-locking-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 043-explicit-plan-locking-ui

## Overview

The `/plan` side of explicit locking: a new `LockWeekControl` component with an inline
confirm, mounted in the This Week header under a strict visibility rule, plus the reworded
locked-view banner and the `/plan` helper-line states.

## Objective

Give the user a deliberate, guarded "Lock in this week" action on the page that is actually
about the current week's committed dinners — reusing `useLockPlan` and the `009`
inline-confirm pattern, with no schema or backend change.

## Stories Included

- **001-lock-in-this-week-action**: "Lock in this week" button + `/plan` helper states (Must)
- **002-inline-lock-confirm**: Inline confirm pill — Keep editing / Lock it in (Must)
- **003-locked-view-reword**: Reworded locked banner + `formatWeekRange` label (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/weekly-plan/components/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- None (first bolt of the intent)

### Enables

- 044-explicit-plan-locking-ui (Shopping List decoupling + test sweep)

## Success Criteria

- [ ] `LockWeekControl` renders correct state for count 0–2 vs exactly 3, unlocked vs locked
- [ ] Inline confirm: focus to "Keep editing", `Escape` / "Keep editing" / pick-change all
      dismiss, "Lock it in" calls the mutation once, failure shows an alert and restores idle
- [ ] Successful lock renders the reworded banner with the week range
- [ ] `tsc -b`, `eslint`, `vite build` clean; `weekly-plan` suite green

## Notes

Model `LockWeekControl` directly on `009`'s `ClearPicksControl` (three prop-driven states,
same a11y contract). Add `uiIcons.lock` here if absent.
