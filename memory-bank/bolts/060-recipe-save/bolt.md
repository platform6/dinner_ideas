---
id: 060-recipe-save
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
type: ddd-construction-bolt
status: complete
stories:
  - 005-atomic-save
  - 006-duplicate-name-handling
  - 007-manual-entry-tests
created: '2026-09-07T03:05:00Z'
started: '2026-09-08T22:44:00Z'
completed: '2026-09-09T01:01:22Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-08T22:44:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-08T22:55:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-08T23:10:00Z'
    artifact: adr-013-aggregate-write-in-one-transaction.md
requires_bolts:
  - 059-recipe-draft-form
enables_bolts:
  - 061-recipe-extraction
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 1
  testing_scope: 3
---

# Bolt: 060-recipe-save

## Objective

Make the dinner catalog writable, atomically, for the first time in the project's life.

## Why `ddd-construction-bolt`

This bolt owns a real design decision with a durable consequence, and it **ships a migration**.
Bolt 055 took the same shape for the same reason — a narrow write path whose correctness had to be
argued before it was coded.

**The decision**: PostgREST inserts are separate HTTP calls, so "all three tables or none" cannot
be had from the browser. Either a Postgres function does the three inserts in one transaction (one
additive migration; correct by construction; what ADR-1's principle points at), or the client
compensates by deleting the dinner on failure (no migration; both children cascade; but the
compensating delete can itself fail, producing exactly the orphan the story forbids).

The `model` and `design` stages exist to settle that and write the ADR. **Do not choose the option
that makes the bolt simpler** — choose the one that makes the invariant hold, and say why.

## Scope

| Story                       | Priority | Note                                            |
| --------------------------- | -------- | ----------------------------------------------- |
| 005-atomic-save             | Must     | The four-table write, the migration, the ADR    |
| 006-duplicate-name-handling | Must     | `dinners.name` is globally unique               |
| 007-manual-entry-tests      | Must     | Component tests, plus pgTAP if a function lands |

## The migration is certain

Resolved decision 3: `dinners.name` uniqueness becomes per-household, replacing the global
constraint inherited from the pre-account-model schema. No client-side approach avoids that, so
this bolt carries a migration regardless of how the atomicity question is answered.

Which means: **do not let "avoids a migration" count as a point in favour of client-side
compensation.** The migration is already there. Judge the two options only on whether the invariant
holds.

## Risks

| Risk                                                      | Mitigation                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Compensation chosen for convenience, orphans appear later | The ADR must argue the invariant, not the effort                |
| A migration lands without pgTAP coverage                  | Story 007 requires it if a function is introduced               |
| The items trigger is "helped" by application code         | ADR-7 forbids it; the trigger fires on insert and needs nothing |

## Definition of Done

- A dinner saves completely or not at all, by whichever mechanism the ADR chose
- `dinners.name` is unique per household; the old global constraint is gone
- Tags are written to `dinner_tags`; a new one is created lowercase, an existing one reused
- It appears in the catalog, is pickable, and cooks correctly in the cooking view
- A duplicate name reads as English and preserves the draft
- New groceries appear unreviewed on `/store`, written only by the existing trigger
- pgTAP covers the migration, and the down-path is documented as every prior migration's is
- `tsc -b`, `eslint`, `vitest` green
