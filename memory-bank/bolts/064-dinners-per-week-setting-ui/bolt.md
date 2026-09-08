---
id: 064-dinners-per-week-setting-ui
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
type: simple-construction-bolt
status: complete
stories:
  - 005-settings-control
created: '2026-09-07T04:00:00Z'
started: '2026-09-08T19:40:00Z'
completed: '2026-09-08T18:47:21Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-08T19:50:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-08T20:10:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-08T20:20:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 063-dinners-per-week-rule
enables_bolts:
  - 065-plan-flow-variable-n
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 064-dinners-per-week-setting-ui

## Objective

One control on `/settings`, following the pattern `week_start_day` already set.

## Why `simple-construction-bolt`

A settings control over a column that exists, with a precedent to copy. Bolt 045 did this exact
thing for `week_start_day`.

## Scope

| Story                | Priority | Note                                 |
| -------------------- | -------- | ------------------------------------ |
| 005-settings-control | Must     | Owner-editable, 1–7, member-readable |

## What matters here

**Copy `week_start_day`'s control rather than inventing a second settings idiom.** Same page, same
ownership rule, same shape of write.

**Say what it affects.** One setting moves four screens — the plan page, the shopping list, the
cooking view and the lock control. That is not obvious from a number input, and a line of copy is
cheaper than the confusion.

## Definition of Done

- An owner can change the value; a member sees it read-only
- Only 1–7 is selectable, so the DB check is unreachable from the UI
- A failed save shows a short message and reverts the displayed value
- `tsc -b`, `eslint`, `vitest` green
