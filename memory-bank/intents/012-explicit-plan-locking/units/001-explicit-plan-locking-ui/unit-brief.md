---
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
phase: inception
status: complete
created: '2026-09-03T22:55:00Z'
updated: '2026-09-03T22:55:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Explicit Plan Locking UI

## Purpose

Make locking a week's plan a first-class, deliberate action on `/plan` (This Week) with an
inline confirm, and remove locking from the Shopping List Copy flow. Reuses the existing
`lock_weekly_plan` RPC and `useLockPlan` hook — no schema, no new backend.

## Scope

### In Scope

- `LockWeekControl` component: quiet "Lock in this week" button → inline confirm pill
  ("Keep editing" / "Lock it in") → parent re-renders locked (FR-1, FR-2)
- Mounting it in the `/plan` header under the exact visibility rule: current week, unlocked,
  exactly 3 selections (FR-1)
- `/plan` helper-line states for 0–2 picks / 3 picks / locked / past week (FR-6)
- Rewording the `/plan` locked banner: "locked in — saved to your history" (drop "shopping
  list has already been sent") + `formatWeekRange` label (FR-3)
- Removing from `ShoppingListPage`: the "Also lock this week's plan" checkbox, `lockChecked` /
  `shouldLock` / `lockErrorMessage` state, `useLockPlan` import, the `lockPlan.mutateAsync`
  call in `handleCopy`, and the lock-branched success copy (FR-4)
- A non-blocking "This week isn't locked in yet — lock it on This Week" note under the Copy
  button, shown only for an unlocked 3-pick current-week plan (FR-5)
- `uiIcons.lock` (Lucide `Lock`) if not already exported
- New `LockWeekControl.test.tsx`; extended `PlanPage.test.tsx`; updated
  `ShoppingListPage.test.tsx` (FR-7)

### Out of Scope

- The planning-week rollover / window — intent `011`
- The manual mid-week "Clear picks" reset — intent `009`
- Any unlock / relock path
- Any change to `lock_weekly_plan`, `weekly_plans`, or the `meal_history` trigger
- The near-week-end "lock before rollover" nudge (revisit after `011`)

---

## Assigned Requirements

| FR   | Requirement                                              | Priority |
| ---- | -------------------------------------------------------- | -------- |
| FR-1 | "Lock in this week" action on `/plan`                    | Must     |
| FR-2 | Inline lock confirmation (reuse `009` pattern)           | Must     |
| FR-3 | Locked-state rendering + reworded copy                   | Must     |
| FR-4 | Remove locking from the Shopping List Copy flow          | Must     |
| FR-5 | Non-blocking "not locked yet" nudge on the Shopping List | Should   |
| FR-6 | `/plan` helper-line states                               | Should   |
| FR-7 | Tests                                                    | Must     |

---

## Domain Concepts

### Key Entities

_None new._ Consumes `WeeklyPlan` (`locked_at`, `weekly_plan_selections`) for display and the
lock decision.

### Key Operations

| Operation          | Description                                                      | Inputs    | Outputs                                                                            |
| ------------------ | ---------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| Lock the week      | Call `useLockPlan().mutateAsync(plan.id)` after inline confirm   | `plan.id` | `locked_at` set; `meal_history` rows written by trigger; `/plan` re-renders locked |
| Copy shopping list | `navigator.clipboard.writeText(text)` only — no lock side effect | list text | clipboard write outcome                                                            |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 6     |
| Must Have     | 4     |
| Should Have   | 2     |
| Could Have    | 0     |

### Stories

| Story ID                         | Title                                                       | Priority | Status  |
| -------------------------------- | ----------------------------------------------------------- | -------- | ------- |
| 001-lock-in-this-week-action     | "Lock in this week" button + `/plan` helper states          | Must     | Planned |
| 002-inline-lock-confirm          | Inline confirm pill (Keep editing / Lock it in)             | Must     | Planned |
| 003-locked-view-reword           | Reworded locked banner + week-range label                   | Must     | Planned |
| 004-shopping-list-lock-decoupled | Remove all lock wiring from ShoppingListPage; plain copy    | Must     | Planned |
| 005-not-locked-yet-nudge         | Non-blocking pointer to /plan when copying an unlocked week | Should   | Planned |
| 006-lock-flow-tests              | Consolidated new/updated test coverage across both pages    | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                                   | Reason                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `001-weekly-dinner-planner` (complete) | `weekly_plans.locked_at`, `lock_weekly_plan`, `useLockPlan`, `PlanPage`, `ShoppingListPage`, the exactly-3 + `meal_history` triggers |

### Depended By

| Unit                                | Reason                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `011-planning-week-rollover` (next) | Needs locking to be a clear standalone action before rollover makes it the sole `meal_history` feeder |

### External Dependencies

| System                          | Purpose         | Risk |
| ------------------------------- | --------------- | ---- |
| Supabase `lock_weekly_plan` RPC | Reused verbatim | Low  |
| `lucide-react` (`Lock`)         | One icon glyph  | Low  |

---

## Technical Context

### Suggested Technology

Chakra UI v2 + existing theme; TanStack Query (`useLockPlan` already invalidates
`currentPlanKey`); React Router (`RouterLink` for the FR-5 note); Vitest + Testing Library.
No new frameworks (per `standards/tech-stack.md`).

### Integration Points

| Integration                        | Type           | Protocol                    |
| ---------------------------------- | -------------- | --------------------------- |
| `weekly-plan/hooks.ts#useLockPlan` | Consumed as-is | React hook → `supabase.rpc` |

### Data Storage

_None owned._ `isConfirming` is local component state.

---

## Constraints

- Inline-confirm interaction must match `009`'s `ClearPicksControl` (shared mental model;
  `009` ships right after `011`).
- Lock action lives **only** on `/plan`.
- Locking stays one-way; no unlock in v1.
- `ShoppingListPage`'s two responsive layouts (header-controls vs. stacked) must both still
  render and copy correctly after the checkbox is removed.

---

## Success Criteria

### Functional

- [ ] "Lock in this week" shows only at current week + unlocked + exactly 3 selections
- [ ] Inline confirm: opens focusing "Keep editing"; `Escape` / "Keep editing" / picking a
      dinner all dismiss; "Lock it in" calls the lock mutation exactly once
- [ ] After a successful lock, `/plan` shows the reworded locked banner with the week range
- [ ] A failed lock shows an inline error and restores the confirm pill
- [ ] `ShoppingListPage` has no `useLockPlan` import; copying never locks; success text is
      "Copied!"
- [ ] The "not locked yet" note shows for an unlocked 3-pick current week and is absent when
      locked; copy still succeeds

### Non-Functional

- [ ] No schema change, no migration, no new backend
- [ ] Existing `weekly-plan`, `shopping-list`, `cooking-view` suites green
- [ ] `meal_history` still written on lock (trigger unchanged) — asserted via the existing
      lock test path

### Quality

- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] All acceptance criteria met
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                         | Type   | Stories       | Objective                                                                           |
| ---------------------------- | ------ | ------------- | ----------------------------------------------------------------------------------- |
| 043-explicit-plan-locking-ui | Simple | 001, 002, 003 | The `/plan` side: lock action, inline confirm, reworded locked view + helper states |
| 044-explicit-plan-locking-ui | Simple | 004, 005, 006 | The Shopping List decoupling + non-blocking nudge + consolidated test pass          |

Sequence: `043 → 044`. `044` depends on `043` only for the shared `uiIcons.lock` add and the
final cross-page test sweep; the `ShoppingListPage` edits are otherwise independent.

---

## Notes

`009-clear-picks-reset` is the design template for `LockWeekControl` — same three-state
prop-driven shape, same a11y contract. Building `012` first means that when `009` is picked
up, its `ClearPicksControl` has a sibling to match.
