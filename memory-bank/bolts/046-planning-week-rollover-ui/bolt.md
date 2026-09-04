---
id: 046-planning-week-rollover-ui
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
type: simple-construction-bolt
status: planned
stories:
  - 001-planning-week-date-helpers
  - 002-week-aware-current-plan
  - 003-week-aligned-plan-creation
created: '2026-09-03T22:55:00Z'
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts:
  - 045-week-start-setting
enables_bolts:
  - 047-planning-week-rollover-ui
requires_units: []
blocks: false

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 046-planning-week-rollover-ui

## Overview

The data/logic layer of rollover: pure planning-week date helpers, a week-aware
`useCurrentPlan` (resolve by planning-week start, not newest-by-created_at), week-aligned plan
creation, and the cross-consumer audit.

## Objective

Redefine "current plan" as "this planning week's plan" and make new plans file themselves
under the right week — the foundation the catalog surface and rollover render on.

## Stories Included

- **001-planning-week-date-helpers**: `planningWeekStart` / `currentPlanningWeekStart` + full
  date tests (Must)
- **002-week-aware-current-plan**: `useCurrentPlan` via `fetchPlanByStartDate`; query re-key;
  4-consumer audit (Must)
- **003-week-aligned-plan-creation**: `useToggleSelection` / `createPlan` stamp the
  week-aligned `start_date`; drop `todayIsoDate()` as a plan start (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/weekly-plan/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 045-week-start-setting (a readable `week_start_day`)

### Enables

- 047-planning-week-rollover-ui (renders and rolls over on top of this resolution)

## Success Criteria

- [ ] `planningWeekStart` correct for all 7 weekdays, boundaries, month/year wrap, DST weeks
- [ ] `useCurrentPlan` resolves the current planning week's plan; `null` when none; older
      unlocked plan never populates the catalog
- [ ] First pick creates a plan with `start_date === currentPlanningWeekStart(...)`, found
      again after reload
- [ ] Consumer audit (CatalogPage, PlanPage offset 0, ShoppingListPage, CookingViewPage)
      documented; no consumer regressed
- [ ] `tsc -b`, `eslint`, `vite build` clean; `weekly-plan` suite green

## Notes

Highest-uncertainty bolt of the intent — `useCurrentPlan` is shared. Treat the consumer audit
as a hard gate and write its findings into the walkthrough.
