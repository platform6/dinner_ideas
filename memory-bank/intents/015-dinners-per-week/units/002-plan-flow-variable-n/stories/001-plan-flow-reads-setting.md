---
id: 001-plan-flow-reads-setting
unit: 002-plan-flow-variable-n
intent: 015-dinners-per-week
status: complete
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 065-plan-flow-variable-n
implemented: true
---

# Story: 001-plan-flow-reads-setting

## User Story

**As a** household that changed its number
**I want** every screen to agree with the setting
**So that** the app does not tell me to pick 3 when we plan 5

## Acceptance Criteria

- [ ] **Given** a household set to N, **When** the plan page renders, **Then** its "full" state, its
      lock control and its nudge copy all use N.
- [ ] **Given** the shopping list and cooking view, **When** fewer than N dinners are picked,
      **Then** each shows its gate; at N, each shows content.
- [ ] **Given** `useShoppingListDinners` and the cooking-view hook, **When** they run, **Then** they
      are enabled at N rather than at exactly 3.
- [ ] **Given** any user-facing string, **When** read, **Then** none states a fixed number the
      setting can contradict — "Pick 3 dinners" becomes the household's number or wording that
      names none.
- [ ] **Given** the codebase, **When** searched at the end of this story, **Then** no hard-coded
      selection count remains in these flows.

## Technical Notes

Known sites, from a grep that should be **re-run rather than trusted** — it is a snapshot:

| File                                            | What                                 |
| ----------------------------------------------- | ------------------------------------ |
| `weekly-plan/components/PlanPage.tsx`           | `isFull`, nudge copy, two conditions |
| `weekly-plan/components/LockWeekControl.tsx`    | `selectionCount < 3` and its comment |
| `shopping-list/components/ShoppingListPage.tsx` | Gate + "Pick 3 dinners" copy         |
| `shopping-list/hooks.ts`                        | `enabled: sortedIds.length === 3`    |
| `cooking-view/components/CookingViewPage.tsx`   | Gate + "Pick 3 dinners" copy         |
| `cooking-view/hooks.ts`                         | `enabled: sortedIds.length === 3`    |

These gates are affordances, not enforcement — the real rule is unit 001's trigger. A client that
gets N wrong shows the wrong prompt; it cannot corrupt a plan.

## Dependencies

### Requires

- Unit 001

### Enables

- 002-plan-flow-tests

## Out of Scope

- What any screen does once its gate passes
