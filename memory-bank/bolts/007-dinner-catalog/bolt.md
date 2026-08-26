---
id: 007-dinner-catalog
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
type: ddd-construction-bolt
status: complete
stories:
  - 003-dinner-step-by-step-instructions
created: '2026-08-26T19:43:10Z'
started: '2026-08-26T22:36:48Z'
completed: '2026-08-26T23:02:18Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-08-26T22:38:22Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-08-26T22:40:27Z'
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: '2026-08-26T22:41:34Z'
    artifact: null
  - name: implement
    completed: '2026-08-26T22:55:55Z'
    artifact: supabase/migrations/20260826224346_dinner_catalog_steps.sql
  - name: test
    completed: '2026-08-26T23:02:18Z'
    artifact: ddd-03-test-report.md
requires_bolts:
  - 001-dinner-catalog
enables_bolts:
  - 008-weekly-dinner-planner-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 007-dinner-catalog

## Overview

Follow-up bolt for the (already-complete) dinner-catalog unit: adds a `dinner_steps` table and writes real step-by-step cooking instructions for all 50 seed dinners, to support the new Cooking View requirement (FR-8).

## Objective

Give every seed dinner a structured, ordered set of cooking steps — additive to the existing schema, applied via a new migration rather than editing the original one.

## Stories Included

- **003-dinner-step-by-step-instructions**: Dinner step-by-step instructions (Must)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- ✅ **1. Domain Model**: Complete → `ddd-01-domain-model.md`
- ✅ **2. Technical Design**: Complete → `ddd-02-technical-design.md`
- ✅ **3. ADR Analysis**: Complete (none warranted) → n/a
- ✅ **4. Implement**: Complete → Supabase migration (`dinner_steps` table + seed step content)
- ✅ **5. Test**: Complete → `ddd-03-test-report.md`

## Dependencies

### Requires
- **001-dinner-catalog** (Required, complete): `dinner_steps.dinner_id` references `dinners`

### Enables
- 008-weekly-dinner-planner-ui (cooking view needs real step data)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [ ] Code reviewed

## Notes

Small, low-complexity bolt — one additive table plus content authoring for 50 existing dinners (no new domain complexity; the ingredients-table pattern already established in `001-dinner-catalog` applies directly).

This bolt exists because FR-8 (Cooking View) was added during Construction, after unit `001-dinner-catalog` was already marked complete — see `inception-log.md` Scope Changes.
