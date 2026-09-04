---
intent: 012-explicit-plan-locking
phase: inception
status: draft
updated: '2026-09-03T22:55:00Z'
---

# Explicit Plan Locking — Unit Decomposition

## Units Overview

**One unit.** Every FR is a single cohesive frontend slice against the existing
`weekly-plan` / `shopping-list` features and the existing `lock_weekly_plan` RPC — a new
`/plan` action + its inline confirm, a wording change to the locked view, and the removal of
lock wiring from `ShoppingListPage` plus a small nudge. No backend surface, no schema.
Same single-UI-unit shape as `003-frontend-review-remediation` and `009-clear-picks-reset`.

### Unit 1: 001-explicit-plan-locking-ui

**Description**: Owns the whole feature — the `LockWeekControl` component and its three inline
states (FR-1, FR-2), its placement in the `/plan` header, the `/plan` helper-line states
(FR-6), the reworded locked-view copy (FR-3), the removal of all lock wiring from
`ShoppingListPage` and the plain-copy result (FR-4), the non-blocking "not locked yet" note on
the shopping list (FR-5), and the new + updated tests (FR-7).

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/weekly-plan/components/LockWeekControl.tsx` — **new**; quiet button →
  inline confirm pill → (parent re-renders locked). Prop-driven:
  `{ selectionCount: number; onLock: () => void; isLocking?: boolean }`, owns only
  `isConfirming` locally. Interaction pattern copied from `009`'s `ClearPicksControl`.
- `src/features/weekly-plan/components/LockWeekControl.test.tsx` — **new**
- `src/features/weekly-plan/components/PlanPage.tsx` — mount `LockWeekControl` in the header
  when `isCurrentWeek && !isLocked && selections.length === 3`; own the `useLockPlan` mutation
  - error `Alert`; reword the locked banner (FR-3); add the FR-6 helper-line states; focus
    management (confirm → "Keep editing", success → landmark).
- `src/features/weekly-plan/components/PlanPage.test.tsx` — extend
- `src/features/shopping-list/components/ShoppingListPage.tsx` — remove the lock `Checkbox`,
  `lockChecked` / `shouldLock` / `lockErrorMessage` state, the `useLockPlan` import and the
  `lockPlan.mutateAsync` call in `handleCopy`; make copy-success text lock-agnostic; add the
  FR-5 note (`RouterLink` to `/plan`) shown only for an unlocked 3-pick current-week plan.
- `src/features/shopping-list/components/ShoppingListPage.test.tsx` — update (copy never
  locks; success text; nudge visibility)
- `src/shared/theme` / icon barrel — add `uiIcons.lock` (Lucide `Lock`) if not already present.

**Dependencies**:

- Depends on: `001-weekly-dinner-planner` (complete) — `weekly_plans.locked_at`,
  `lock_weekly_plan`, `useLockPlan`, `PlanPage`, `ShoppingListPage`,
  `trg_weekly_plans_require_three_on_lock`, `trg_weekly_plans_record_meal_history`;
  `009-clear-picks-reset` (design pattern reference only — not a code dependency; `009`
  actually ships _after_ this).
- Depended by: `011-planning-week-rollover` (sequenced after — relies on locking being a
  clear, standalone action before rollover makes it the sole `meal_history` feeder).

**Estimated Complexity**: **S** — one new component (three trivial states, pattern already
proven by `009`), one mutation already written (`useLockPlan`), a wording change, and a
delete-and-simplify pass on `ShoppingListPage`. The risk is the `ShoppingListPage` regression
surface (two responsive layouts, existing copy tests), not new logic.

## Unit Dependency Graph

```text
[001-weekly-dinner-planner (complete)] ──> [001-explicit-plan-locking-ui] ──> (enables intent 011)
```

## Execution Order

1. `001-explicit-plan-locking-ui` (only unit). Natural bolt order: the `/plan` lock action +
   confirm + locked-view reword first (the new capability), then the `ShoppingListPage`
   decoupling + nudge + consolidated test pass.

## Requirement-to-Unit Mapping

- **FR-1** ("Lock in this week" action on `/plan`) → `001-explicit-plan-locking-ui`
- **FR-2** (inline lock confirm) → `001-explicit-plan-locking-ui`
- **FR-3** (locked-state reword) → `001-explicit-plan-locking-ui`
- **FR-4** (remove locking from Copy flow) → `001-explicit-plan-locking-ui`
- **FR-5** (non-blocking "not locked yet" nudge) → `001-explicit-plan-locking-ui`
- **FR-6** (`/plan` helper-line states) → `001-explicit-plan-locking-ui`
- **FR-7** (tests) → `001-explicit-plan-locking-ui`
