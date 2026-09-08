---
unit: 001-plan-uniqueness-scope
intent: 017-plan-rollover-remediation
phase: inception
status: complete
created: '2026-09-08T00:00:00Z'
updated: '2026-09-08T00:00:00Z'
---

# Unit Brief: Plan Uniqueness Scope

## Purpose

Make "one unlocked plan" mean one per week rather than one for all time, so a new week can be
planned while an old draft still exists.

## Scope

### In Scope

- The index: `unique (household_id, start_date) where locked_at is null`, `nulls not distinct`
- Its comment, which currently states the rule being removed
- The pgTAP case that encodes the old rule, and the stale workaround comments in the
  meal-history suite
- The operational decision about the stale production draft `bf0206d0…`

### Out of Scope

- The failure message (unit 002)
- Any rollover flow for unfinished drafts (open question, a future intent)
- Any RLS, trigger or table change

---

## Assigned Requirements

| FR   | Title                               | Priority |
| ---- | ----------------------------------- | -------- |
| FR-1 | Scope the uniqueness to the week    | Must     |
| FR-2 | The tests assert the new rule       | Must     |
| FR-4 | The stale production draft resolved | Must     |

## Key Constraints

- **Preserve the concurrency guarantee.** Bolt 027 added this index so two racing creates could
  not both succeed. Scoped to the week, that still holds; losing it would trade one bug for the
  one it was written to prevent.
- **Preserve `nulls not distinct`.** Intent 004's null-household window depends on it.
- **Widening only** — no existing row can violate the new index, so no data remediation is needed
  for the migration itself to apply.
- **Do not fix this in the client.** ADR-1: the invariant belongs in Postgres.

## The trap

The pgTAP suite currently asserts the bug as intended behaviour:

> `'a second unlocked weekly plan is rejected while one already exists'`

Updated carelessly — for example by simply deleting it — the suite goes green while proving
nothing. It must be **rewritten** to assert rejection for the same week and acceptance for a
different one, and a case should reproduce the exact production scenario.

## Interfaces Consumed

| Interface                       | From                                                  | Notes                       |
| ------------------------------- | ----------------------------------------------------- | --------------------------- |
| `idx_weekly_plans_one_unlocked` | intent 001, bolt 027; rescoped by intent 004 bolt 027 | The thing being changed     |
| `weekly_plans.start_date`       | intent 011                                            | What the index now includes |

## Dependencies

**Requires**: none

**Enables**: `002-plan-create-failure-surface`

## Definition of Done

- A household can hold an unlocked draft for an earlier week and create this week's plan
- Two concurrent creates for the same week still collide
- pgTAP proves both, including a case reproducing the production scenario
- No test still asserts one-unlocked-plan-per-household-globally
- The index comment describes the rule that now exists
- The stale draft `bf0206d0…` is locked or deleted, with the reasoning recorded
- `tsc -b`, `eslint`, `vitest`, pgTAP all green
