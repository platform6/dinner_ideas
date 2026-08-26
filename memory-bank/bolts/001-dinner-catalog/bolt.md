---
id: 001-dinner-catalog
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
type: ddd-construction-bolt
status: complete
stories:
  - 001-dinner-catalog-schema
  - 002-seed-healthy-family-dinners
created: '2026-08-26T17:31:13Z'
started: '2026-08-26T17:42:16Z'
completed: '2026-08-26T18:11:06Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-08-26T17:45:57Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-08-26T17:47:51Z'
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: '2026-08-26T17:47:51Z'
    artifact: null
  - name: implement
    completed: '2026-08-26T18:08:26Z'
    artifact: supabase/migrations/20260826175605_dinner_catalog_schema.sql, supabase/migrations/20260826175606_seed_healthy_family_dinners.sql
requires_bolts: []
enables_bolts:
  - 002-weekly-planning
  - 003-weekly-dinner-planner-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 001-dinner-catalog

## Overview

Foundational bolt for the dinner-catalog domain: the `dinners`/`dinner_ingredients` schema, RLS policies, and the curated seed data of 20+ healthy family dinners.

## Objective

Stand up a queryable, filterable dinner catalog in Supabase, pre-populated with real seed content, ready for both the weekly-planning domain and the UI to build on.

## Stories Included

- **001-dinner-catalog-schema**: Dinner catalog schema (Must)
- **002-seed-healthy-family-dinners**: Seed healthy family dinners (Must)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- ✅ **1. Domain Model**: Complete → `ddd-01-domain-model.md`
- ✅ **2. Technical Design**: Complete → `ddd-02-technical-design.md`
- ✅ **3. ADR Analysis**: Complete (none warranted) → n/a
- ✅ **4. Implement**: Complete → Supabase migration + seed script
- ⏳ **5. Test**: In Progress (awaiting checkpoint) → `ddd-03-test-report.md`

## Dependencies

### Requires
- None (first bolt)

### Enables
- 002-weekly-planning (needs `dinners` table to reference)
- 003-weekly-dinner-planner-ui (needs catalog data to display)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Low complexity/uncertainty — mostly schema + data curation, no novel logic.
