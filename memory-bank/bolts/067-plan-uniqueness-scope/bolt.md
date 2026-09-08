---
id: 067-plan-uniqueness-scope
unit: 001-plan-uniqueness-scope
intent: 017-plan-rollover-remediation
type: ddd-construction-bolt
status: complete
stories:
  - 001-scope-index-to-week
  - 002-uniqueness-tests
  - 003-stale-draft-remediation
created: '2026-09-08T00:00:00Z'
started: '2026-09-08T16:00:00Z'
completed: '2026-09-08T16:46:10Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-09-08T16:10:00Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-09-08T16:25:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-09-08T16:40:00Z'
    artifact: adr-011-scope-a-stale-invariant-rather-than-remove-it.md
  - name: implement
    completed: '2026-09-08T16:55:00Z'
    artifact: supabase/migrations/20260908170000_plan_uniqueness_per_week.sql
  - name: test
    completed: '2026-09-08T17:20:00Z'
    artifact: ddd-03-test-report.md
requires_bolts: []
enables_bolts:
  - 068-plan-create-failure-surface
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 4
---

# Bolt: 067-plan-uniqueness-scope

## Objective

Unblock production. Make "one unlocked plan" mean one per week.

## ⚠ This bolt unblocks a live outage

Picking a dinner — the app's primary action — currently fails for the founding household, and
everything downstream is unreachable as a result. `blocks: true`.

## Why `ddd-construction-bolt`

The DDL is one line. The thinking is not: what exactly should the invariant be, does the
concurrency protection survive rescoping, and what do the tests need to assert so this cannot
recur. The `model` and `design` stages exist for that, and the ADR is the deliverable that
outlives the fix.

## Scope

| Story                       | Priority | Note                                      |
| --------------------------- | -------- | ----------------------------------------- |
| 001-scope-index-to-week     | Must     | `unique (household_id, start_date)`       |
| 002-uniqueness-tests        | Must     | **Rewrite** the case that encodes the bug |
| 003-stale-draft-remediation | Must     | Production data; product owner decides    |

## What matters here

**Rescope, do not remove.** Bolt 027 added this index deliberately — two racing creates could
otherwise both succeed and orphan data. That protection is still wanted; only its scope was wrong.
A fix that drops the index trades this bug for the one it was written to prevent.

**The failing test is the trap.** `'a second unlocked weekly plan is rejected while one already
exists'` currently asserts the bug as intended behaviour. Deleting it turns the suite green while
proving nothing. Rewrite it.

**Read the meal-history suite's comments.** They record working around "the live project's"
unlocked plan — this bug, seen a release cycle early and filed as a CI quirk. Correct them, and
note in the ADR that the signal existed and was misread. That is the durable lesson.

**Widening cannot fail on data**, so no rehearsal and no staging are needed — the opposite of
intent 010. Say so in the deployment record rather than leaving the absence unexplained.

**The stale row is the product owner's call.** Locking invents history if those dinners were not
eaten. Do not decide it in code.

## Definition of Done

- A new week's plan can be created while an earlier draft is unlocked
- Two creates for the same week still collide
- pgTAP proves both, plus the exact production scenario
- No test asserts the global rule; the index comment matches reality
- The stale draft is resolved by explicit decision, recorded
- ADR written: what the invariant is, why rescoping preserves bolt 027's guarantee, and how the
  signal was missed
- `tsc -b`, `eslint`, `vitest`, pgTAP all green
