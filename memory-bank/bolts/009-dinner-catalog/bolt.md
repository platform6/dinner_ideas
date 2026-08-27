---
id: 009-dinner-catalog
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
type: ddd-construction-bolt
status: complete
stories:
  - 004-generic-tags-schema
created: '2026-08-27T01:00:00Z'
started: '2026-08-27T02:00:00Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-08-27T02:15:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-08-27T02:25:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-08-27T02:26:00Z'
    artifact: null
  - name: implement
    completed: '2026-08-27T03:00:00Z'
    artifact: supabase/migrations/20260827020000_dinner_catalog_tags.sql (applied to remote "dinner ideas" project by user via supabase db push)
requires_bolts: []
enables_bolts:
  - 012-weekly-dinner-planner-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-08-27T18:38:12Z'
---

# Bolt: 009-dinner-catalog

## Overview

Replaces the `rosie_approved` boolean with a generic, lowercase-normalized tag system (`tags` + `dinner_tags`), so any tag can be attached to any dinner rather than a single fixed kid-friendly flag.

## Objective

Give the catalog a real tagging schema, added post-deployment after the user asked to clear the seeded Rosie-approved data and manage tags freely going forward (FR-9).

## Stories Included

- **004-generic-tags-schema**: Generic tags schema (Must)

## Bolt Type

**Type**: DDD Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- [ ] **1. Domain Model**
- [ ] **2. Technical Design**
- [ ] **3. Test Report**
- [ ] **4. Implement**
- [ ] **5. Verify**

## Dependencies

### Requires

- None — additive migration against the already-complete `001-dinner-catalog` schema

### Enables

- **012-weekly-dinner-planner-ui**: Needs this bolt's tags schema for the tag management UI

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Additive migration only — does not modify `20260826175605_dinner_catalog_schema.sql`. `rosie_approved` and its seeded values are dropped with no auto-migration to a tag (every dinner starts untagged), per explicit user decision — see `inception-log.md` Scope Changes (2026-08-27).
