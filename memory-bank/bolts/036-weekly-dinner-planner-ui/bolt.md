---
id: 036-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 017-at-capacity-list-banner
created: '2026-08-28T00:00:00Z'
started: '2026-08-28T13:00:00Z'
completed: '2026-08-28T21:41:35Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T13:10:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T13:30:00Z'
    artifact: implementation-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 036-weekly-dinner-planner-ui

## Overview

Consolidates the at-capacity ("already picked 3") feedback in the dinner catalog. The
per-card inline `notice` in `DinnerCard.tsx` is removed; a single banner is added to
`CatalogPage.tsx` above the dinner grid, shown only while the current plan has 3
selections. Cards keep their existing dim + "Full" pick pill.

## Objective

Stop one sentence from repeating down every un-picked catalog card once the week is full
(story `017`) — a post-deployment polish item. Presentation-only: no state shape,
selection logic, or persistence changes.

## Stories Included

- **017-at-capacity-list-banner**: Single list-level at-capacity banner, replacing the per-card notice (Should)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan** → implementation-plan.md
- [ ] **2. Implement** → implementation-walkthrough.md
- [ ] **3. Test** → test-walkthrough.md

## Dependencies

### Requires

- None — the pick-3 flow, `selectionDisabled`, `selectedDinnerIds`, and the `isLocked`
  card styling all already exist from bolt `004-weekly-dinner-planner-ui` and the
  Kitchen Table restyle (`016-kitchen-table-ui`).

### Enables

- None

## Success Criteria

- [ ] Story `017` implemented, all acceptance criteria met
- [ ] `DinnerCard.tsx` no longer renders the "Already have 3 picked" inline notice; `opacity` dim and "Full" pill unchanged
- [ ] `CatalogPage.tsx` shows one banner between the filter row and the grid when `selectedDinnerIds.size >= 3`, and not otherwise (incl. locked / no-plan)
- [ ] Banner is an accessible live region (Chakra `Alert` or `role="status"`)
- [ ] `DinnerCard.test.tsx` updated to drop the old string assertion; `CatalogPage.test.tsx` covers banner shown at 3 / hidden at <3 and when locked
- [ ] `npx tsc -b`, `eslint`, `vite build` all clean
- [ ] Code reviewed

## Notes

Single-concern polish bolt. Two files touched (`DinnerCard.tsx`, `CatalogPage.tsx`) plus
their tests. `CatalogFilterState`, `filters.ts`, hooks, and the weekly-plan feature are
untouched. Independent of all other planned/complete bolts.
