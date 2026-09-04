---
id: 050-location-item-model
unit: 001-location-item-model
intent: 010-grocery-store-location-model
type: ddd-construction-bolt
status: planned
stories:
  - 001-stores-and-locations-schema
  - 002-items-registry-and-sync-trigger
  - 003-item-and-category-placements
  - 004-location-resolution-query
  - 005-suggestion-dismissals
  - 006-reorder-location-rpc
created: '2026-09-04T14:30:00Z'
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: []
enables_bolts:
  - 051-location-item-model
  - 052-store-config-page
  - 053-store-config-page
  - 054-shopping-list-ordering
requires_units: []
blocks: false

complexity:
  avg_complexity: 3
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 050-location-item-model

## Overview

Every new table for the Store/Location/Item model: `stores`, `locations`, the new Items
registry with its trigger-based sync, `item_placements`, `category_placements`,
`suggestion_dismissals`, the location-resolution query, and the generalized reorder RPC. The
cutover migration (existing data → this model) is bolt 051, not here.

## Objective

Land a complete, tested, household-scoped data model for individual-ingredient placement with
category-level fallback — the foundation both the store-config page and the shopping-list
sort will read from.

## Stories Included

- **001-stores-and-locations-schema**: `stores` + `locations`, RLS (Must)
- **002-items-registry-and-sync-trigger**: `items` + get-or-create trigger, source-agnostic
  (Must)
- **003-item-and-category-placements**: explicit + inherited placement, composite FKs (Must)
- **004-location-resolution-query**: explicit → inherited → unassigned (Must)
- **005-suggestion-dismissals**: rejected-pairing suppression table (Must)
- **006-reorder-location-rpc**: race-safe reorder scoped by store (Must)

## Bolt Type

**Type**: ddd-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- [ ] **1. model**: Pending → ddd-01-domain-model.md
- [ ] **2. design**: Pending → ddd-02-technical-design.md
- [ ] **3. implement**: Pending → supabase/migrations/
- [ ] **4. test**: Pending → ddd-03-test-report.md

## Dependencies

### Requires

- None (first bolt of the intent)

### Enables

- 051-location-item-model (the cutover, needs these tables to exist)
- 052/053-store-config-page, 054-shopping-list-ordering (read this bolt's tables/query/RPC)

## Success Criteria

- [ ] All 5 tables + the trigger + the reorder RPC exist, household-scoped, composite-FK
      cross-store safety verified
- [ ] Registry dedup verified from both a direct insert and the trigger path
- [ ] Resolution query returns the correct state for explicit/inherited/unassigned, including
      0-match
- [ ] `supabase test db` green; migration reviewed; ADR written for the Item-registry design

## Notes

Highest-uncertainty bolt of the intent — the Items registry is a genuinely new domain concept
in this codebase. Its ADR should stand on its own so a future recipe-import intent can read it
rather than re-derive the same reasoning.
