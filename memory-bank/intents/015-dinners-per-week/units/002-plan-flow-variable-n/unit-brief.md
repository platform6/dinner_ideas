---
unit: 002-plan-flow-variable-n
intent: 015-dinners-per-week
phase: inception
status: complete
created: '2026-09-07T04:00:00Z'
updated: '2026-09-07T04:00:00Z'
---

# Unit Brief: Plan Flow Honours N

## Purpose

Replace the hard-coded 3 everywhere the app reads it, so the setting is real rather than nominal.

## Scope

### In Scope

- `PlanPage`: the `isFull` check, the lock nudge, and the `selections.length === 3` conditions
- `LockWeekControl`: the `selectionCount < 3` guard and its comment
- `ShoppingListPage` and `CookingViewPage`: the `< 3` gates and their "Pick 3 dinners" copy
- `useShoppingListDinners` and the cooking-view hook: `enabled: length === 3` becomes N
- Component tests covering the above at a non-default N

### Out of Scope

- The column, the triggers, and the settings control (unit 001)
- Any change to what the shopping list or cooking view _do_ once the gate passes

---

## Assigned Requirements

| FR   | Title                                 | Priority |
| ---- | ------------------------------------- | -------- |
| FR-6 | Every client site honours the setting | Must     |

## Key Constraints

- **No user-facing string may state a fixed number.** "Pick 3 dinners" appears in at least two
  places and must become the household's number, or wording that does not name one.
- **The gates are a UX affordance, not the enforcement.** The real rule is in Postgres (unit 001).
  A client site that gets N wrong is a display bug, not a data-integrity one — worth remembering
  when deciding how defensively to code it.
- Reading the setting is one more household query. It should follow whatever `week_start_day`'s
  consumers already do rather than inventing a second pattern.

## Known Sites

| File                                            | What                                 |
| ----------------------------------------------- | ------------------------------------ |
| `weekly-plan/components/PlanPage.tsx`           | `isFull`, nudge copy, two conditions |
| `weekly-plan/components/LockWeekControl.tsx`    | `selectionCount < 3` and its comment |
| `shopping-list/components/ShoppingListPage.tsx` | Gate + "Pick 3 dinners" copy         |
| `shopping-list/hooks.ts`                        | `enabled: sortedIds.length === 3`    |
| `cooking-view/components/CookingViewPage.tsx`   | Gate + "Pick 3 dinners" copy         |
| `cooking-view/hooks.ts`                         | `enabled: sortedIds.length === 3`    |

This list came from a grep and should be re-run at build time rather than trusted — it is a
snapshot, not a guarantee.

## Dependencies

**Requires**: `001-dinners-per-week-model`

**Enables**: none

## Definition of Done

- Every site in the table reads the household's number
- No user-facing copy names a fixed count
- Tests cover a household at a non-default N, not only at 3
- `tsc -b`, `eslint`, `vitest` all green
