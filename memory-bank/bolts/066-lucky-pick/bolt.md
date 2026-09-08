---
id: 066-lucky-pick
unit: 001-lucky-pick
intent: 016-feeling-lucky
type: simple-construction-bolt
status: complete
stories:
  - 001-weighted-draw
  - 002-lucky-control
  - 003-lucky-tests
created: '2026-09-07T04:10:00Z'
started: '2026-09-08T22:00:00Z'
completed: '2026-09-08T19:48:11Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-09-08T22:10:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-09-08T22:40:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-09-08T22:50:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts: []
requires_units:
  - 015/001-dinners-per-week-model
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 3
---

# Bolt: 066-lucky-pick

## Objective

One button that fills the week with dinners you have not had lately.

## Why `simple-construction-bolt`

Client-side only: a pure function, a control, and writes through a path that already exists. No
migration, no new table, no new query shape.

## Blocked on intent 015

`dinners_per_week` must exist before this can fill to it. This bolt cannot start until
`063-dinners-per-week-rule` has shipped that column.

## Scope

| Story             | Priority | Note                                            |
| ----------------- | -------- | ----------------------------------------------- |
| 001-weighted-draw | Must     | Pure, seedable; recency-weighted                |
| 002-lucky-control | Must     | Fills empty slots only; disabled states say why |
| 003-lucky-tests   | Must     | Bias measured across many seeded draws          |

## What matters here

**Keep the draw pure and inject the random source.** This is the whole reason the feature is
testable. A component calling `Math.random()` inline can be neither shown to be random nor shown to
be biased correctly — and both are the feature's actual promises.

**It must stay a draw.** If pressing twice always yields the same answer, this is a sorted list
with a button on it. Weighting shifts the odds; it does not decide the outcome.

**Suppression outranks randomness.** `is_active = false` is a user saying "not this one". A random
pick that overrules it is a bug, not a surprise.

**Do not enforce the cap here.** Intent 015's trigger does. This control computes slot counts for
the UI, but its arithmetic is not the guarantee, and treating it as one is how the two drift apart.

**Non-destructive by design, so no confirm.** Intent 009 already ships Clear Picks for a full
re-roll — clear, then press lucky.

## Definition of Done

- One press fills the remaining slots, keeping existing picks
- Recently-eaten dinners are drawn less often; never-eaten ones are fully eligible
- Suppressed and already-picked dinners are never drawn
- Too few candidates fills what it can and says it ran out
- A locked or full week disables the control with the reason visible
- Bias and randomness are both proven with a seeded source across many draws
- `tsc -b`, `eslint`, `vitest` green
