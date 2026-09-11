---
id: 070-extraction-reports-servings
unit: 002-scale-on-review
intent: 018-serving-scale-and-removal
type: simple-construction-bolt
status: planned
stories:
  - 001-extraction-reports-servings
  - 002-scaling-is-pure-code
created: '2026-09-11T16:24:16Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 069-servings-setting
enables_bolts:
  - 071-scale-control
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 070-extraction-reports-servings

## Objective

The model reports what the page says. Code does the arithmetic.

## Why `simple-construction-bolt`

No domain model, no schema, no migration — a prompt change, a parser field, and a pure module.
Same shape as bolt 061, which was also a change to how the extraction behaves rather than to what
the system is.

## What matters here

**This is the boundary move the whole intent exists for.** Before: a language model divides every
quantity by a ratio it infers. After: it reports, and tested code computes.

The bug that started intent 018 was not bad division — on both pages tested it was exact. It was
division _at all_: unasked, invisible, and unreachable by any test.

**The rounding rule is a real decision, not an implementation detail.** 1 cup scaled by 3/9 is
0.333... cup, which nobody can measure. Rounding badly recreates the exact harm the bug report
described, from the other direction. Write the rule down and test it.

**Scaling must not be destructive.** FR-3 requires undo, so the source quantities have to survive
the operation — scale into a new draft, never in place.

**A range is not a number.** "8-10 servings" is carried as written. Neither the model nor the
parser may resolve it.

## Definition of Done

- The prompt contains no rescaling instruction, and a test asserts its ABSENCE
- The draft carries the source's stated serving count, as stated, including ranges
- A pure scaling module: multiply, round by a written rule, non-destructive
- Tests cover scaling up, down, identity, fractions, and the repeating-decimal case
- `tsc -b`, `eslint`, `vitest` green
