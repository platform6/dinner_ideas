---
id: 063-dinners-per-week-rule
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
type: ddd-construction-bolt
status: complete
stories:
  - 001-dinners-per-week-column
  - 002-selection-cap-honours-setting
  - 003-lock-honours-setting
  - 004-rule-tests
created: '2026-09-07T04:00:00Z'
started: '2026-09-08T18:00:00Z'
completed: '2026-09-08T18:05:49Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-08T18:10:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-08T18:25:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-08T18:40:00Z'
    artifact: adr-012-restate-set-search-path-when-replacing-a-function.md
  - name: implement
    completed: '2026-09-08T18:55:00Z'
    artifact: supabase/migrations/20260908190000_dinners_per_week.sql
  - name: test
    completed: '2026-09-08T19:20:00Z'
    artifact: ddd-03-test-report.md
requires_bolts: []
enables_bolts:
  - 064-dinners-per-week-setting-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 1
  testing_scope: 4
---

# Bolt: 063-dinners-per-week-rule

## Objective

Move the three-dinner rule from a constant in two triggers to a household setting, without losing
the concurrency guarantee that was bought with a bug fix.

## Why `ddd-construction-bolt`

A migration that changes enforced invariants, in code with a known race-condition history. The
`model` and `design` stages exist to reason about the locking before touching it.

## Scope

| Story                             | Priority | Note                                       |
| --------------------------------- | -------- | ------------------------------------------ |
| 001-dinners-per-week-column       | Must     | Follows `week_start_day` exactly           |
| 002-selection-cap-honours-setting | Must     | **The risky one** — keeps the `for update` |
| 003-lock-honours-setting          | Must     | Includes renaming the misnamed function    |
| 004-rule-tests                    | Must     | pgTAP at a non-default N                   |

## What matters here

**Do not disturb the serialisation.** `20260827002830` exists because two concurrent inserts could
each read a count below the cap and both commit. The `for update` on the **plan** row is the fix.
Parameterising the bound adds a second read; it must not move or weaken that lock.

Reading `dinners_per_week` needs no lock of its own — a setting change concurrent with a pick is
not a correctness problem, because whichever value the transaction sees, "no more than that many at
commit" still holds. **Write that argument into the migration**, the way the concurrency fix wrote
its own.

**Rename the lock function.** `fn_weekly_plans_require_three_on_lock` names the constant this bolt
removes. Drop the old name explicitly; do not leave it beside a new one.

**Correct the meal-history comment.** That function is already N-agnostic — it inserts one row per
selection via a `select`. Only its comment says "Writes 3 meal_history rows". A comment that lies
about an invariant is worse than none.

## Definition of Done

- The column exists, defaults to 3, constrained 1–7, with no new RLS policy
- Both triggers compare against the setting and say the real number in their messages
- The lock function is renamed and the old name dropped
- pgTAP proves: accept at N, reject at N+1, the concurrent race still cannot win, locking at N,
  and one meal-history row per selection at a non-default N
- The deploy is a **no-op** for a household that never changes the setting
- `tsc -b`, `eslint`, `vitest`, pgTAP all green
