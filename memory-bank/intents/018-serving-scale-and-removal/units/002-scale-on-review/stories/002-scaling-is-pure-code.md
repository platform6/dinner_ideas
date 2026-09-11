---
id: 002-scaling-is-pure-code
unit: 002-scale-on-review
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T16:24:16Z'
assigned_bolt: null
implemented: false
---

# Story: 002-scaling-is-pure-code

## User Story

**As a** future maintainer
**I want** the scaling to be a pure function
**So that** a quantity on a shopping list is never wrong because a model divided badly

## Acceptance Criteria

- [ ] **Given** a draft and a from/to serving pair, **When** scaled, **Then** every ingredient
      quantity is multiplied by the ratio
- [ ] **Given** scaling, **When** applied, **Then** the result is a NEW draft — the source
      quantities survive, so it can be undone (FR-3)
- [ ] **Given** a quantity that scales to a repeating decimal, **When** rendered, **Then** it is
      rounded to something a person can measure, by a rule that is written down and tested
- [ ] **Given** scaling, **When** tested, **Then** cases cover whole numbers, fractions, scaling up,
      scaling down, and the identity case

## Technical Notes

- The rounding rule is a real decision, not an implementation detail: 0.333... cup is unmeasurable,
  and rounding badly is the same harm the bug report described
- Quantities are strings on the draft (bolt 059); parse, multiply, and re-stringify at one boundary
