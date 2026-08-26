---
id: 003-weekly-dinner-planner-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 001-household-login
  - 002-browse-filter-sort-catalog
  - 009-suppress-dinner
created: '2026-08-26T17:31:13Z'
started: '2026-08-26T19:36:03Z'
completed: '2026-08-26T21:27:31Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-26T20:08:13Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-26T20:45:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-26T21:27:31Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 001-dinner-catalog
enables_bolts:
  - 004-weekly-dinner-planner-ui
requires_units:
  - 001-dinner-catalog
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 003-weekly-dinner-planner-ui

## Overview

First UI bolt: shared household login, the browsable/filterable dinner catalog page, and the suppress/un-suppress "not interested" action.

## Objective

Stand up the app's entry point — auth gate plus a working catalog view with cuisine/cook-time/Rosie-approved filters, cook-time sort, and the ability to hide/unhide dinners.

## Stories Included

- **001-household-login**: Household login (Must)
- **002-browse-filter-sort-catalog**: Browse/filter/sort catalog (Must)
- **009-suppress-dinner**: Suppress dinner (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- ✅ **1. Plan**: Complete → `implementation-plan.md`
- ✅ **2. Implement**: Complete → Source code + `implementation-walkthrough.md`
- ✅ **3. Test**: Complete → `test-walkthrough.md`

## Dependencies

### Requires
- **001-dinner-catalog** (Required): Needs seeded `dinners`/`dinner_ingredients` data to display

### Enables
- 004-weekly-dinner-planner-ui (pick-3 flow builds on the catalog view)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [ ] Code reviewed

## Notes

App scaffolding (Vite + React + Chakra UI + PWA plugin setup, Supabase client init) happens here as part of Stage 1/2 groundwork, even though it isn't its own story.
