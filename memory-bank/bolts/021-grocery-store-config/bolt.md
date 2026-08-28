---
id: 021-grocery-store-config
unit: 004-grocery-store-config
intent: 001-weekly-dinner-planner
type: simple-construction-bolt
status: complete
stories:
  - 003-default-grocery-store-rows
created: '2026-08-28T00:00:00Z'
started: '2026-08-28T02:00:00Z'
completed: '2026-08-28T15:39:08Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T02:10:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T02:30:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T02:50:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 021-grocery-store-config

## Overview

Adds a one-time seed migration that replaces any existing grocery store row configuration
with 5 default rows (Dairy, Grains, Pantry, Produce, Protein) and auto-assigns the 5 seed
ingredient categories one-to-one to those rows, so the shopping list groups in store order
with zero setup.

## Objective

Deliver FR-15 — a known-good default store layout — as a data migration. No schema change,
no new domain entities, no RPC or UI change; hence a simple bolt rather than a DDD bolt
despite unit `004`'s prior bolt (`011`) being DDD.

## Stories Included

- **003-default-grocery-store-rows**: Default grocery store rows & category assignments (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan** → implementation-plan.md
- [ ] **2. Implement** → implementation-walkthrough.md
- [ ] **3. Test** → test-walkthrough.md

## Dependencies

### Requires

- Tables `grocery_store_rows` + `category_row_assignments` and the reorder function — all
  delivered by bolt `011-grocery-store-config` (complete). No incomplete dependency, so
  `blocks: false`.

### Enables

- None

## Success Criteria

- [ ] Migration applied: exactly 5 rows (positions 1..5) + 5 category assignments, replacing prior config
- [ ] Shopping list for an existing plan renders groups in order Dairy → Grains → Pantry → Produce → Protein (live-verified)
- [ ] Unassigned categories still fall back to alphabetical after configured rows (unchanged FR-12 behaviour)
- [ ] Migration is safe to re-run (delete-then-insert or `on conflict` guard)
- [ ] pgTAP assertion added for the seeded rows/assignments
- [ ] Code reviewed

## Notes

Destructive by design: the user chose "Replace with defaults", so any rows/assignments the
household previously configured are discarded. Treat as a data migration against live data,
not app-startup logic. Independent of bolt `020`.
