---
stage: implement
bolt: 043-explicit-plan-locking-ui
created: '2026-09-04T00:35:00Z'
---

## Implementation Walkthrough: 001-explicit-plan-locking-ui (bolt 043)

### Summary

Added a deliberate "Lock in this week" action to `/plan` (This Week): a new prop-driven
`LockWeekControl` that swaps a button in place for an inline confirm, wired into `PlanPage`
with the existing `useLockPlan` mutation. Added the `/plan` helper-line states and reworded
the locked banner. No schema, no backend, no new dependency.

### Structure Overview

`LockWeekControl` is a pure presentational control (three states: hidden below 3 selections,
idle button, inline confirm pill) that owns only its `isConfirming` flag. `PlanPage` owns the
`useLockPlan` mutation, the error `Alert`, post-success focus, and resets the control to idle
after a pick change via a React `key` derived from the selection ids. The interaction shape
(focus to the safe option on open, `Escape` to cancel, no animation) mirrors intent 009's
planned `ClearPicksControl`, establishing the shared pattern.

### Completed Work

- [x] `src/features/weekly-plan/components/LockWeekControl.tsx` — new control: renders `null`
      below 3 selections; an idle primary "Lock in this week" button (lock glyph, shows a
      spinner while the parent's mutation is pending); an inline confirm `HStack`
      (`role="group"` + `aria-label="Confirm locking this week's plan"`) with "Keep editing"
      and "Lock it in". Focus moves to "Keep editing" on open; `Escape` cancels.
- [x] `src/features/weekly-plan/components/PlanPage.tsx` — imports `useLockPlan` and
      `LockWeekControl`; adds a `headingRef` (focus target on success) with `tabIndex={-1}` on
      the `<h1>`; `handleLock` calls `lockPlan.mutateAsync(plan.id)`; new header-region block
      renders the "Pick 3 dinners to lock in your week." helper (1–2 picks) or the
      `LockWeekControl` + context line (exactly 3 picks); a sibling error `Alert` on
      `lockPlan.isError`; the current-week locked banner reworded to "This week's plan is
      locked in — saved to your history." with a `formatWeekRange` eyebrow.
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` — updated the locked-state
      assertion string to match the reworded banner (full lock-flow coverage is bolt 044 /
      story 006).

### Key Decisions

- **Placement**: a dedicated block directly below the page header rather than inside the
  week-nav `HStack` or folded into the existing "All three picked" (`isFull`) block. The
  `isFull` block was left untouched — it is a shopping-list affordance, not locking.
- **Idle button = primary `solid`**: locking is an affirmative commit, so it reads as a
  primary action (not the restrained `quiet` used for 009's "Clear picks").
- **Reset-on-pick-change via `key`**: `key={selections.map(s => s.dinner_id).join(',')}` on
  `LockWeekControl` — a removal already unmounts the whole `=== 3` block, and the key remounts
  it to idle for any other selection identity change. No effect wiring in the child.
- **Spinner on the idle button**: after "Lock it in", the child closes the pill and the idle
  button shows `isLoading` (same as 009's pattern) — on failure it simply reappears idle with
  the error `Alert` beside it, ready to retry.
- **"Your next week opens {date}" line** (story 003, Could): omitted — it depends on intent
  011 and there is no feature to gate on yet. Noted for 011.

### Deviations from Plan

None. All three checkpoint decision points resolved to the recommended options (leave
`isFull` untouched · `solid` idle button · eyebrow week-range line).

### Dependencies Added

None. `uiIcons.locked` (Lucide `Lock`) already existed; `useLockPlan` / `lock_weekly_plan` /
`formatWeekRange` all reused as-is.

### Developer Notes

- `useLockPlan` already invalidates the current-plan query on success, so the locked view
  renders with no extra refetch and `LockWeekControl` unmounts (its `!isLocked` condition
  fails).
- The existing `ShoppingListPage` test "copies and locks by default" still passes — that
  coupling is removed in bolt 044, not here.
- Gate values verified against live `PlanPage`: `isCurrentWeek`, `isLocked`, `selections`,
  `isFull` were already derived; only `useLockPlan` + `headingRef` were added.
