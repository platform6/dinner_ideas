---
id: 065-plan-flow-variable-n
unit: 002-plan-flow-variable-n
intent: 015-dinners-per-week
type: simple-construction-bolt
status: complete
stories:
  - 001-plan-flow-reads-setting
  - 002-plan-flow-tests
created: '2026-09-07T04:00:00Z'
started: '2026-09-08T20:35:00Z'
completed: '2026-09-08T18:59:23Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-08T20:45:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-08T21:00:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-08T21:10:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 064-dinners-per-week-setting-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 065-plan-flow-variable-n

## Objective

Make every screen agree with the setting.

## Why `simple-construction-bolt`

A wide, shallow sweep with no design decisions in it. Six known files across four features.

## Scope

| Story                       | Priority | Note                                          |
| --------------------------- | -------- | --------------------------------------------- |
| 001-plan-flow-reads-setting | Must     | Six sites; re-grep rather than trust the list |
| 002-plan-flow-tests         | Must     | Tested at a non-default N                     |

## What matters here

**Re-run the grep.** The file list in the story is a snapshot taken during inception. Trusting it
is how a site gets missed.

**Test at a number that is not 3.** A suite that only exercises the default has not tested this
feature at all — it has re-tested the old behaviour.

**And test that the default is unchanged.** The intent's promise is that this is invisible to a
household that never opens settings. That promise should have a test.

## Definition of Done

- Every site reads the household's number; no hard-coded count remains in these flows
- No user-facing string names a fixed number
- Tests cover a non-default N **and** confirm default behaviour is identical to today
- `tsc -b`, `eslint`, `vitest` green
