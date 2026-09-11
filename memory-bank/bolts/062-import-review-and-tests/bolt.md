---
id: 062-import-review-and-tests
unit: 002-recipe-import
intent: 014-recipe-entry
type: simple-construction-bolt
status: complete
stories:
  - 004-proxy-error-messages
  - 005-draft-review-handoff
  - 006-import-tests
created: '2026-09-07T03:05:00Z'
started: '2026-09-11T14:05:00Z'
completed: '2026-09-11T15:30:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-11T14:05:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-11T14:45:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-11T15:30:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 061-recipe-extraction
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 062-import-review-and-tests

## Objective

Land the draft in the form for review, say something useful when the call fails, and prove the
boundary behaves.

## Why `simple-construction-bolt`

Wiring and messages over work already done. No new mechanism.

## Scope

| Story                    | Priority | Note                                             |
| ------------------------ | -------- | ------------------------------------------------ |
| 004-proxy-error-messages | Must     | Five reachable codes, five distinct messages     |
| 005-draft-review-handoff | Must     | The draft lands in unit 001's form; no save here |
| 006-import-tests         | Must     | Unit 001's page tests must pass unmodified       |

## What matters here

**This unit writes nothing.** FR-7's review step is guaranteed structurally rather than by
discipline: the import path has no save of its own to accidentally call. Keep it that way — if this
bolt finds itself needing a save, the boundary has been drawn wrong.

**A household without a key is a normal state**, not an error. It is how every household starts.
`no_api_key` should read as "Claude isn't set up yet, here's where" rather than as a failure.

**Unit 001's page tests must pass unmodified**, the same standard bolt 058 was held to: the import
path is additive to a page that already worked, and an unmodified suite is the evidence.

## What cannot be tested, and must be said so

Extraction quality depends on a live model and cannot be unit-tested. Sizing, parsing, failure
classification and the handoff can be, and should be thoroughly. Do not write a test that pretends
to verify extraction quality — judge that manually against real pasted pages, report it as manual,
and treat it as the evidence for this unit's cut criterion.

## Definition of Done

- Every reachable proxy error code has its own plain message; pasted text always survives
- A successful extraction lands in the form with steps in order; nothing is written until an
  explicit save
- Unit 001's entry-page tests pass **unmodified**
- Manual check against several real recipe pages reported honestly, including whether steps survive
- `tsc -b`, `eslint`, `vitest` green
