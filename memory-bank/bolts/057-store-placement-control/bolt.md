---
id: 057-store-placement-control
unit: 002-store-placement-control
intent: 013-placement-edit-control
type: simple-construction-bolt
status: complete
stories:
  - 004-needs-review-section
  - 005-similarity-suggestion-on-review
  - 006-store-placement-tests
created: '2026-09-05T17:40:00Z'
started: '2026-09-05T20:30:00Z'
completed: '2026-09-05T21:15:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-05T20:35:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-05T20:55:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-05T21:15:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 055-placement-review-state
  - 056-store-placement-control
enables_bolts:
  - 058-shopping-list-move
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 3
  testing_scope: 2
---

# Bolt: 057-store-placement-control

## Objective

Turn the empty unassigned section into a working review queue, give each row a suggested stop,
and prove the whole unit with fixtures that resemble real data.

## Why `simple-construction-bolt`

Frontend against an existing model. The only new data dependency is bolt 055's `reviewed_at`.

## Scope

| Story                               | Priority | Note                                                         |
| ----------------------------------- | -------- | ------------------------------------------------------------ |
| 004-needs-review-section            | Must     | Re-scopes `UnassignedSection`; drops the in-recipe narrowing |
| 005-similarity-suggestion-on-review | Should   | Reuses `similarity.ts` unchanged; strictly local, no API     |
| 006-store-placement-tests           | Must     | Carries the fixture-realism rule for the whole unit          |

## The story that matters most here

**006** is not routine test work. Intent 010's component suites passed at 290/290 while the
feature was unreachable in production, because they constructed `unassigned` items directly —
a state the data model cannot produce. This bolt's tests must be built from a realistic
placement distribution (everything inherited, nothing unassigned), so that a future change
making the feature unreachable **fails** instead of passing.

## Risks

| Risk                                                    | Mitigation                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Fixtures drift back to convenient-but-impossible states | Story 006's fifth acceptance criterion is explicit; consider a shared fixture helper |
| Suggestion computation slows the queue's first paint    | Compute lazily per visible row if needed — but measure first                         |
| Review costs more than one tap per item                 | Acceptance criterion; an import of ten recipes must not become a chore               |

## Definition of Done

- The queue lists exactly the unreviewed items; both actions clear a row
- Suggestions appear where similarity is confident, and are silently absent otherwise
- No orphaned tests assert the old unassigned-only behaviour
- `Bakery`, `Aisle 1` and `Garmantasdf` can each hold a manually placed item
- `tsc -b`, `eslint`, `vitest` green
