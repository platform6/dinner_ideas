---
id: 072-remove-a-dinner
unit: 003-remove-a-dinner
intent: 018-serving-scale-and-removal
type: ddd-construction-bolt
status: complete
stories:
  - 001-remove-a-dinner
  - 002-confirm-before-removing
  - 003-removal-tests
created: '2026-09-11T16:24:16Z'
started: '2026-09-11T18:06:25Z'
completed: '2026-09-11T18:25:24Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-11T18:09:05Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-11T18:10:32Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-11T18:11:35Z'
    artifact: adr-015-removing-a-dinner-removes-its-history.md
  - name: implement
    completed: '2026-09-11T18:17:03Z'
    artifact: supabase/migrations/20260911181346_remove_dinner.sql
  - name: test
    completed: '2026-09-11T18:25:23Z'
    artifact: ddd-03-test-report.md
requires_bolts: []
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 3
  testing_scope: 4
---

# Bolt: 072-remove-a-dinner

## Objective

Make the catalog correctable. Delete a dinner and its children, atomically.

## Why `ddd-construction-bolt`

The only destructive operation in the project, and it crosses four tables with live references
from plans and meal history. Atomicity is a requirement (NFR-3), which is the same argument that
made bolt 060 a DDD bolt — the aggregate boundary and the transaction boundary are the same
boundary, on the way out as much as on the way in.

## What matters here

**Warn and proceed, do not refuse** (Checkpoint 2). Refusing would leave a wrong recipe in the
catalog permanently the moment anyone cooked it — the exact trap this intent exists to escape.

**The shared tag vocabulary must survive.** Delete the links, never the tags. A household's
vocabulary is shared and has no other way back.

**What happens to a locked plan that referenced the removed dinner is this bolt's question to
answer, not to dodge.** Meal history, `dinner_last_chosen` and plan selections all point here.

**"Not interested" stays.** It is the non-destructive option and the two must not read as the same
thing.

## Definition of Done

- A dinner and its ingredients, steps and tag links are removed atomically
- The shared tag vocabulary is untouched
- RLS holds: another household's dinner cannot be removed
- Confirmation is required and says it cannot be undone; a dinner with history says what it affects
- The name becomes reusable afterwards
- pgTAP mirrors `create_dinner_rpc_test.sql`; `tsc -b`, `eslint`, `vitest` green
