---
id: 020-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 015-standalone-tag-filter-dropdown
  - 016-rename-filter-menu-cuisine
created: '2026-08-28T00:00:00Z'
started: '2026-08-28T00:30:00Z'
completed: '2026-08-28T14:29:44Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T00:45:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T01:05:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T01:40:00Z'
    artifact: test-walkthrough.md
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

# Bolt: 020-weekly-dinner-planner-ui

## Overview

Restructures the catalog filter row: splits the tag multi-select out of the shared overflow
menu into its own "Tags" dropdown, and renames the remaining menu from "More" to "Cuisine".
Both changes live in a single component (`CatalogFilters.tsx`) and ship together.

## Objective

Make cuisine vs. tag filtering visually distinct and self-describing (FR-13, FR-14) — a small
post-deployment polish item raised from using the live app.

## Stories Included

- **015-standalone-tag-filter-dropdown**: Standalone tag filter dropdown (Must)
- **016-rename-filter-menu-cuisine**: Rename catalog filter menu "More" → "Cuisine" (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan** → implementation-plan.md
- [ ] **2. Implement** → implementation-walkthrough.md
- [ ] **3. Test** → test-walkthrough.md

## Dependencies

### Requires

- None — the tag filter, `useAllTags`, and the cuisine menu already exist from bolts
  `012-weekly-dinner-planner-ui` and earlier. This bolt only restructures presentation.

### Enables

- None (last planned bolt for this unit)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing (`CatalogFilters` / `CatalogPage` coverage updated for the new "Tags" button and "Cuisine" label)
- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Code reviewed

## Notes

Pure presentation-layer change — no state shape, storage, or filter-logic changes
(`CatalogFilterState` and `filters.ts` are untouched). Independent of bolt `021`.
