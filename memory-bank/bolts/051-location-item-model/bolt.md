---
id: 051-location-item-model
unit: 001-location-item-model
intent: 010-grocery-store-location-model
type: ddd-construction-bolt
status: complete
stories:
  - 007-cutover-migration
  - 008-standards-and-decision-docs
created: '2026-09-04T14:30:00Z'
started: '2026-09-04T19:56:26Z'
completed: '2026-09-04T21:25:40Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-04T19:59:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-04T20:50:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-04T20:55:53Z'
    artifact: adr-009-deferred-destructive-retirement.md
  - name: implement
    completed: '2026-09-04T21:07:00Z'
    artifact: supabase/migrations/20260904190000_location_item_model_cutover.sql
  - name: test
    completed: '2026-09-04T21:10:00Z'
    artifact: ddd-03-test-report.md
requires_bolts:
  - 050-location-item-model
enables_bolts:
  - 052-store-config-page
  - 053-store-config-page
  - 054-shopping-list-ordering
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 3
---

# Bolt: 051-location-item-model

## Overview

The forward cutover: seed a Store per household, carry `grocery_store_rows` +
`category_row_assignments` into the new model, backfill the Items registry, retire the old
tables — then record the model change in the standards docs.

## Objective

Ship the migration that makes every existing household's configuration work, unchanged in
effect, under the new model — with zero explicit item placements created, so day-one sorting
comes entirely from category inheritance.

## Stories Included

- **007-cutover-migration**: seed + carry-across + backfill + retire old tables (Must)
- **008-standards-and-decision-docs**: architecture/decision-index updates (Should)

## Bolt Type

**Type**: ddd-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

Per `ddd-construction-bolt` v2.0.0 (5 stages; stage 3 optional):

- ✅ **1. Domain Model**: Complete → ddd-01-domain-model.md
- ✅ **2. Technical Design**: Complete → ddd-02-technical-design.md
- ✅ **3. ADR Analysis**: Complete → adr-009
- ✅ **4. Implement**: Complete → 20260904190000_location_item_model_cutover.sql + standards docs
- ✅ **5. Test**: Complete → location_item_model_cutover_test.sql (30/30) + ddd-03-test-report.md

## Dependencies

### Requires

- 050-location-item-model (the tables this migration writes into)

### Enables

- 052/053-store-config-page, 054-shopping-list-ordering (build against the post-cutover data
  shape, not the old tables)

## Success Criteria

- [ ] Every existing household has exactly one seeded Store
- [ ] `grocery_store_rows` → `locations` and `category_row_assignments` →
      `category_placements` carry across with `type` correctly inferred
- [ ] `items` backfilled from distinct existing ingredient names; zero `item_placements`
      created
- [ ] Old tables dropped only after their data is confirmed across
- [ ] The resolution query's output for a configured household is equivalent to the old
      model's output for the same data (no regression)
- [ ] Standards docs + decision-index updated; `001` u004's brief notes "superseded by `010`"

## Notes

This is the bolt with the real regression risk — treat the equivalence check (against unit
3's fixture, story 002) as a hard gate before calling this bolt done.
