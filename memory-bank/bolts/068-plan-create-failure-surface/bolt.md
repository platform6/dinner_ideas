---
id: 068-plan-create-failure-surface
unit: 002-plan-create-failure-surface
intent: 017-plan-rollover-remediation
type: simple-construction-bolt
status: planned
stories:
  - 001-honest-pick-failure-message
created: '2026-09-08T00:00:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 067-plan-uniqueness-scope
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 068-plan-create-failure-surface

## Objective

Stop advising a retry that cannot work.

## Why `simple-construction-bolt`

One message, one branch, in an alert that already exists.

## Scope

| Story                           | Priority | Note                     |
| ------------------------------- | -------- | ------------------------ |
| 001-honest-pick-failure-message | Should   | Branch on the error code |

## What matters here

**Branch on the code, never the text.** Postgres's message wording is not a contract; matching on
it is a test that passes until someone upgrades the database.

**Do not over-claim.** The UI cannot know _why_ a constraint failed. Say that it could not be
saved and that retrying will not help — not a guess at the cause.

**This is a `Should`, and it is cuttable.** Bolt 067 makes this exact failure unreachable. The
value here is the _next_ unforeseen constraint failure, which is real but not urgent.

## Definition of Done

- A constraint failure does not say "try again"; a transient one still does
- The branch is on the error code
- No raw error object reaches the UI
- `tsc -b`, `eslint`, `vitest` green
