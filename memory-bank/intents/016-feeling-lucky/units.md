---
intent: 016-feeling-lucky
phase: inception
status: units-defined
updated: '2026-09-07T04:10:00Z'
---

# Units: I'm Feeling Lucky

## Decomposition Principle

One unit. The feature is a control, a pure function behind it, and the writes — small enough that
splitting it would create parts that deliver nothing alone.

## Unit Summary

| Unit             | Name       | Requirements     | Depends on | Cuttable |
| ---------------- | ---------- | ---------------- | ---------- | -------- |
| `001-lucky-pick` | Lucky Pick | FR-1, 2, 3, 4, 5 | intent 015 | No       |

## Unit 001: Lucky Pick

**Owns**: the catalog control, the weighted draw, the fill-empty-slots write path, and the
disabled/ran-out states.

**Depends on intent 015** for `dinners_per_week`. It cannot fill to a number that does not exist.

**Why one unit**: the draw without a control is untestable in practice, and the control without the
draw is a button that does nothing. This is one coherent change.

## Requirements Coverage

| Requirement                          | Unit |
| ------------------------------------ | ---- |
| FR-1 A lucky control on the catalog  | 001  |
| FR-2 It fills only empty slots       | 001  |
| FR-3 It honours the household number | 001  |
| FR-4 It prefers less-recent dinners  | 001  |
| FR-5 Only pickable dinners qualify   | 001  |

No open questions.
