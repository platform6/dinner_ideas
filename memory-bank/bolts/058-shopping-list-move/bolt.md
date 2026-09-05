---
id: 058-shopping-list-move
unit: 003-shopping-list-move
intent: 013-placement-edit-control
type: simple-construction-bolt
status: deferred
stories:
  - 001-move-from-shopping-list
  - 002-shopping-list-move-tests
created: '2026-09-05T17:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 055-placement-review-state
  - 057-store-placement-control
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 2
  max_dependencies: 3
  testing_scope: 2
---

# Bolt: 058-shopping-list-move

> **⏸ DEFERRED 2026-09-05 — product owner's decision, not a blocker.**
>
> Intent 013's core value is delivered by bolts 055–057: any grocery or category can be moved,
> everything is reachable by name, and newly arrived items surface for review. This bolt adds a
> second entry point to a flow that already works.
>
> Unit 003 is `Should` and depends on nothing, which is exactly why it was isolated. Deferring it
> releases intent 013 sooner and closes intent 010's Checkpoint 4, which has been held open since
> the v0.10.0 deploy.
>
> **Nothing here is abandoned.** The plan, stories and cut criterion stand as written; the bolt
> can be picked up unchanged whenever the shopping-list move is wanted. The question it exists to
> answer — whether the affordance can be discoverable without degrading checking items off — is
> better answered after living with the store page for a while.

## Objective

Let a grocery be moved from the shopping list, where the mismatch is actually noticed, without
making the list worse at the thing it exists for.

## Why `simple-construction-bolt`

A new entry point to an existing flow. Smallest bolt in the intent — same shape as bolt 054.

## Scope

| Story                        | Priority | Note                                    |
| ---------------------------- | -------- | --------------------------------------- |
| 001-move-from-shopping-list  | Should   | Item placements only; never category    |
| 002-shopping-list-move-tests | Must     | Existing suite must pass **unmodified** |

## This bolt is cuttable

Unit 003 is `Should` and depends on nothing. If the move affordance cannot be made discoverable
without degrading the checking-off experience, the right outcome is to **say so and cut it** —
not to ship the compromise. Intent 013 delivers its core value without this bolt.

## Risks

| Risk                                               | Mitigation                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The affordance competes with checking items off    | Story 002's first criterion: the existing suite passes untouched, or the tension is real and the bolt is cut |
| A re-sort jumps a half-completed list to the top   | Explicit acceptance criterion on scroll and check state                                                      |
| An optimistic reorder misrepresents a failed write | Criterion requires the list stay unchanged on failure                                                        |

## Definition of Done

- An item can be moved from the list; the list re-sorts and marks it reviewed
- Check state and scroll position survive the re-sort
- Existing shopping-list tests pass **without modification**
- `tsc -b`, `eslint`, `vitest` green
