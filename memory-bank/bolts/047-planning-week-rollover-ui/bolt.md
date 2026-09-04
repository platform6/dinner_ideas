---
id: 047-planning-week-rollover-ui
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
type: simple-construction-bolt
status: complete
stories:
  - 004-catalog-planning-window-label
  - 005-rollover-on-app-open
  - 006-rollover-regression-tests
created: '2026-09-03T22:55:00Z'
started: '2026-09-04T02:30:00Z'
completed: '2026-09-04T02:21:18Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-04T02:30:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-04T02:35:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 046-planning-week-rollover-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 047-planning-week-rollover-ui

## Overview

The visible surface: the catalog planning-window label, rollover recompute on app open, the
`useWeekByOffset` anchor change, and the full cross-surface regression suite.

## Objective

Make "which week am I planning for" visible on the catalog and make a new week start clean on
the next app open — with `/plan`, locking, shopping list and cooking view proven unregressed.

## Stories Included

- **004-catalog-planning-window-label**: `formatWeekRange` window label in the catalog header,
  matching `/plan`; no header reflow (Must)
- **005-rollover-on-app-open**: recompute current planning week at mount; `useWeekByOffset`
  anchor `todayIsoDate()` → `currentPlanningWeekStart(...)`; no timers (Must)
- **006-rollover-regression-tests**: boundary-crossing tests + `/plan` / `012` / shopping-list
  / cooking-view regression; audit findings written up (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → src/features/dinners/, src/features/weekly-plan/
- [ ] **3. test**: Pending → test-walkthrough.md

## Dependencies

### Requires

- 046-planning-week-rollover-ui (the week-aware resolution this renders around)

### Enables

- Intent `009-clear-picks-reset` (now the narrower mid-week reset within the current
  planning week)

## Success Criteria

- [ ] Catalog shows the window label; it matches `/plan` offset 0; no header controls reflow
- [ ] After a simulated boundary crossing + reload: new window, empty catalog, `/plan` offset
      0 = new week, previous week at offset −1 intact
- [ ] No timer / `visibilitychange` / midnight listener added
- [ ] Regression suite green: `/plan` nav, `012` locking + `meal_history`, shopping-list
      generation, cooking view
- [ ] `tsc -b`, `eslint`, `vite build` clean

## Notes

Last bolt of the intent. On completion, `011` is ready for Operations and `009` can be
re-scoped/started.
