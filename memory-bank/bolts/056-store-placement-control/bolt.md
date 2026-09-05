---
id: 056-store-placement-control
unit: 002-store-placement-control
intent: 013-placement-edit-control
type: simple-construction-bolt
status: planned
stories:
  - 001-all-groceries-list
  - 002-category-move
  - 003-uncapped-stop-rows
created: '2026-09-05T17:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 055-placement-review-state
enables_bolts:
  - 057-store-placement-control
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 056-store-placement-control

## Objective

Make everything reachable and movable: an all-groceries searchable list, category moves, and
stop rows that show what they actually hold.

## Why `simple-construction-bolt`

Frontend work against an existing, unchanged data model, reusing an existing assign flow. No new
schema, no new access control. Same shape as bolts 052 and 053.

## Scope

| Story                  | Priority | Note                                                              |
| ---------------------- | -------- | ----------------------------------------------------------------- |
| 001-all-groceries-list | Must     | The story that makes `spaghetti` findable                         |
| 002-category-move      | Must     | First-ever write to `category_placements`; policies already exist |
| 003-uncapped-stop-rows | Must     | Removes `EXPANDED_ITEM_CAP = 4`                                   |

## Split rationale

Unit 002 carries five stories and is the largest in the intent. This bolt takes the three that
are **placement mechanics** — finding, moving, and showing what is there. Bolt 057 takes the
two that are **the review experience**, which depend on bolt 055's column and read more
naturally as one piece of work.

## Risks

| Risk                                                      | Mitigation                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A `category_placements` policy proves missing or wrong    | **Raise it** — do not add a migration inside this unit. The unit brief says so explicitly |
| Uncapping stop rows hurts mobile scrolling                | Produce holds 39 items today; design to ~500 and measure                                  |
| The category move reads as additive rather than replacing | Acceptance criterion covers it; the unique constraint enforces the data side regardless   |

## Definition of Done

- Every item reachable by name and movable
- A category move relocates inheriting items and leaves explicit placements alone
- Expanded stops list everything; collapsed counts are true
- `tsc -b`, `eslint`, `vitest` green
