---
id: 002-weekly-planning
unit: 002-weekly-planning
intent: 001-weekly-dinner-planner
type: ddd-construction-bolt
status: complete
stories:
  - 001-weekly-plan-schema
  - 002-enforce-exactly-three-immutable
  - 003-last-chosen-query
created: '2026-08-26T17:31:13Z'
started: '2026-08-26T18:12:09Z'
completed: '2026-08-26T19:34:40Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-08-26T18:15:07Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-08-26T18:22:19Z'
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: '2026-08-26T19:20:05Z'
    artifact: adr-001-db-enforced-domain-invariants.md
  - name: implement
    completed: '2026-08-26T19:32:22Z'
    artifact: supabase/migrations/20260826192038_weekly_planning_schema.sql
requires_bolts:
  - 001-dinner-catalog
enables_bolts:
  - 004-weekly-dinner-planner-ui
  - 006-weekly-dinner-planner-ui
requires_units:
  - 001-dinner-catalog
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 002-weekly-planning

## Overview

Covers the weekly-plan domain: schema for a week's plan and its (up to 3) selections, DB-level enforcement of "max 3, exactly 3 to lock, immutable once locked" — where locking happens at shopping-list-copy time, not at initial selection — and the last-chosen query that powers variety nudging.

## Objective

Give the app a reliable, DB-enforced way to persist a week's plan in real time as picks are made, keep it freely editable until the shopping list is sent, and know when each dinner was last actually made — the only real enforcement boundary in this no-backend architecture.

## Stories Included

- **001-weekly-plan-schema**: Weekly plan schema (Must)
- **002-enforce-exactly-three-immutable**: Enforce exactly-3 & immutability (Must)
- **003-last-chosen-query**: Last-chosen query (Should)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- ✅ **1. Domain Model**: Complete → `ddd-01-domain-model.md`
- ✅ **2. Technical Design**: Complete → `ddd-02-technical-design.md`
- ✅ **3. ADR Analysis**: Complete → `adr-001-db-enforced-domain-invariants.md`
- ✅ **4. Implement**: Complete → Supabase migration (tables + trigger/constraint + view)
- ⏳ **5. Test**: In Progress → `ddd-03-test-report.md`

## Dependencies

### Requires
- **001-dinner-catalog** (Required): `weekly_plan_selections` references `dinners`

### Enables
- 004-weekly-dinner-planner-ui (pick-3 + persist/lock flow)
- 006-weekly-dinner-planner-ui (variety indicator UI needs last-chosen query)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

The max-3/exactly-3-to-lock/immutability triggers are the trickiest part of this bolt (medium complexity) — flagged in the unit brief as needing careful domain modeling since there's no server layer to fall back on for enforcement.

**Revised 2026-08-26 during Stage 3 (ADR Analysis)**: originally designed as "confirm immediately locks the plan" (`confirmed_at`). Changed to "freely editable until the shopping list is copied, which locks it" (`locked_at`) per user feedback — domain model and technical design (Stages 1–2) were redone accordingly before any migration was applied. See `inception-log.md` Scope Changes.
