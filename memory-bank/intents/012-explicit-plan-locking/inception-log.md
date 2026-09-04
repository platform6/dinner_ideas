---
intent: 012-explicit-plan-locking
created: '2026-09-03T22:27:55Z'
completed: '2026-09-03T23:05:00Z'
status: complete
---

# Inception Log: explicit-plan-locking

## Overview

**Intent**: Make locking a week's plan a first-class, explicit "Lock in this week" action on
`/plan` with an inline confirm, and remove locking from the shopping-list Copy flow.
**Type**: brown-field (enhancement — `weekly-plan` + `shopping-list` + `/plan`)
**Created**: 2026-09-03

## Provenance

Split out of `011-planning-week-rollover` Checkpoint 1 (OQ-5). Product owner: "we need a clear
locking mechanism. I don't think it makes sense as part of copying the grocery list anymore.
Please provide a user experience flow as a separate related intent." UX flow drafted by the
Inception Agent in `requirements.md`, cross-checked against `ShoppingListPage.tsx`,
`PlanPage.tsx`, `weekly-plan/hooks.ts|api.ts`, and the `meal_history` trigger.

## Artifacts Created

| Artifact       | Status                                               | File                                        |
| -------------- | ---------------------------------------------------- | ------------------------------------------- |
| Requirements   | ✅ Checkpoint 1 + 2 approved (2026-09-03)            | requirements.md                             |
| System Context | ✅ draft                                             | system-context.md                           |
| Units          | ✅ draft (1 unit: `001-explicit-plan-locking-ui`)    | units.md                                    |
| Stories        | ✅ 6 stories generated                               | units/001-explicit-plan-locking-ui/stories/ |
| Bolt Plan      | ✅ 2 bolts (`043`, `044`) — **Checkpoint 3 pending** | memory-bank/bolts/043-_, 044-_              |

## Summary

| Metric                      | Count                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| Functional Requirements     | 7                                                                |
| Non-Functional Requirements | 3 groups (Compatibility/Architecture, Accessibility, Regression) |
| Units                       | 1                                                                |
| Stories                     | 6 (4 Must, 2 Should)                                             |
| Bolts Planned               | 2                                                                |

## Decision Log

| Date       | Decision                                                                                                                                                 | Rationale                                                                                                                      | Approved         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 2026-09-03 | Intent `012`, name `explicit-plan-locking`                                                                                                               | Next free prefix after `011`.                                                                                                  | ⏳ pending user  |
| 2026-09-03 | Locking is **decoupled from the shopping-list Copy flow** and becomes an explicit `/plan` action                                                         | Product-owner direction. Copy = copy; lock = a deliberate "commit this week".                                                  | ✅ product owner |
| 2026-09-03 | **Sequence: `012` → `011` → `009`**                                                                                                                      | Rollover (`011`) makes lock the sole feeder of `meal_history`; decoupled explicit locking must exist first or history starves. | ✅ product owner |
| 2026-09-03 | Inline-confirm interaction pattern reused from `009` (`Keep editing` / `Lock it in`, `Escape` cancels, focus to safe option)                             | Consistency; the destructive-ish step gets friction without a modal.                                                           | ✅ product owner |
| 2026-09-03 | **No unlock path** in v1 (OQ-3)                                                                                                                          | `meal_history` is immutable by design; a mistaken lock is recoverable via rollover.                                            | ✅ product owner |
| 2026-09-03 | OQ-1..OQ-6 resolved: lock on `/plan` only; shopping-list nudge included; no unlock; near-week-end nudge deferred; reword locked view; `012` before `011` | Product owner: "I accept this and suggestions above."                                                                          | ✅ product owner |

## Scope Changes

None yet.

## Ready for Construction

**Checklist**:

- [x] Live source cross-checked (ShoppingListPage lock wiring, PlanPage locked states, lock RPC, meal_history trigger)
- [x] UX flow drafted (requirements.md → "Proposed UX Flow")
- [x] Checkpoint 1 — OQ-1..OQ-6 answered (2026-09-03)
- [x] Full FR/NFR written (FR-1..FR-7)
- [x] Requirements approved (Checkpoint 2)
- [x] System context defined
- [x] Units decomposed (1 unit)
- [x] Stories created (6) / Bolts planned (043, 044)
- [x] Human review complete (Checkpoint 3, 2026-09-03)

## Next Steps

1. **Construction**: start with `001-explicit-plan-locking-ui`, bolt `043`.
   → `/specsmd-construction-agent --unit="001-explicit-plan-locking-ui" --bolt-id="043-explicit-plan-locking-ui"`
2. Then bolt `044`.
3. On unit complete → deploy, then resume `011-planning-week-rollover` (sequenced after this).

## Dependencies

```text
001-weekly-dinner-planner (complete) ─┐  weekly_plans.locked_at, lock_weekly_plan RPC, useLockPlan,
                                      │  trg_weekly_plans_require_three_on_lock,
                                      │  trg_weekly_plans_record_meal_history, ShoppingListPage, PlanPage
004-account-model (complete) ─────────┘  household scoping, owner role (if OQ-3 unlock is taken)

012-explicit-plan-locking ──> 011-planning-week-rollover ──> 009-clear-picks-reset
```
