---
id: 055-placement-review-state
unit: 001-placement-review-state
intent: 013-placement-edit-control
type: ddd-construction-bolt
status: complete
stories:
  - 001-reviewed-at-column-and-backfill
  - 002-review-write-path
  - 003-correct-010-record
created: '2026-09-05T17:40:00Z'
started: '2026-09-05T18:00:00Z'
completed: '2026-09-05T19:00:00Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-05T18:05:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-05T18:15:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-05T18:25:00Z'
    artifact: adr-010-narrow-write-to-a-trigger-owned-table.md
  - name: implement
    completed: '2026-09-05T18:45:00Z'
    artifact: supabase/migrations/20260905180000_item_review_state.sql
  - name: test
    completed: '2026-09-05T19:00:00Z'
    artifact: ddd-03-test-report.md
requires_bolts: []
enables_bolts:
  - 056-store-placement-control
  - 057-store-placement-control
  - 058-shopping-list-move
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 055-placement-review-state

## Objective

Add `items.reviewed_at`, backfill it safely, give it a write path that does not breach ADR-7,
and correct the two places in intent 010's record that describe an unreachable state.

## Why `ddd-construction-bolt`

This bolt touches the database and an access-control invariant. It gets the full DDD sequence —
domain model, technical design, implement, test — for the same reason bolts 050 and 051 did.
The write-path choice in story 002 is a genuine design decision with two defensible answers, and
it deserves a recorded rationale rather than an inline judgement call.

## Scope

| Story                               | Priority | Note                                                                       |
| ----------------------------------- | -------- | -------------------------------------------------------------------------- |
| 001-reviewed-at-column-and-backfill | Must     | One additive migration; the bounded backfill is the subtle part            |
| 002-review-write-path               | Must     | Column-scoped grant vs. `security definer` RPC — **decide and record why** |
| 003-correct-010-record              | Should   | Documentation only; no code                                                |

## Expected Artifacts

- `ddd-01-domain-model.md`
- `ddd-02-technical-design.md` — must state the write-path decision and its rationale
- One migration under `supabase/migrations/`
- pgTAP coverage proving both the permitted and the refused write
- `ddd-03-test-report.md`
- Amendments to `memory-bank/intents/010-grocery-store-location-model/requirements.md`

## Risks

| Risk                                              | Mitigation                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The write path widens access to `items.name`      | ADR-7's invariant is the acceptance criterion, tested explicitly, not assumed           |
| The backfill races the sync trigger               | Bound the update to a snapshot of pre-existing ids; test by inserting during the window |
| An ADR may be warranted for the write-path choice | If the decision is non-obvious, write one — bolt 051 set the precedent with ADR-9       |

## Definition of Done

- Clean-slate `supabase db reset` applies the full chain
- pgTAP green, including the refused-write case
- Intent 010's requirements carry both corrections, each pointing at intent 013
- `tsc -b`, `eslint`, `vitest` green
