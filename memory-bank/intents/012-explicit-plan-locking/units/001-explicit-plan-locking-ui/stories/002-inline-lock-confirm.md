---
id: 002-inline-lock-confirm
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 043-explicit-plan-locking-ui
implemented: true
---

# Story: 002-inline-lock-confirm

## User Story

**As a** household member about to lock the week
**I want** a quick in-place confirm before it commits
**So that** a single mis-tap can't freeze my picks

## Acceptance Criteria

- [ ] **Given** the "Lock in this week" button is shown, **When** I press it, **Then** the
      button is replaced in place by an `HStack` pill (`role="group"`,
      `aria-label="Confirm locking this week's plan"`) reading _"Lock in these 3? You won't be
      able to change this week's picks."_ with a **"Keep editing"** button and a
      **"Lock it in"** button.
- [ ] **Given** the pill opens, **When** focus settles, **Then** focus is on **"Keep
      editing"** (the safe option).
- [ ] **Given** the pill is open, **When** I press "Keep editing", press `Escape`, or
      add/remove a dinner, **Then** the pill dismisses back to the idle button with no lock
      call made.
- [ ] **Given** the pill is open, **When** I press "Lock it in", **Then** `useLockPlan()
    .mutateAsync(plan.id)` is called exactly once and "Lock it in" shows a loading spinner
      while pending.
- [ ] **Given** the lock succeeds, **When** the mutation resolves, **Then** `/plan` re-renders
      in its locked state (story 003) and focus moves to a stable landmark (the confirmation
      text or the page heading).
- [ ] **Given** the lock fails, **When** the mutation rejects, **Then** an inline
      `Alert status="error"` shows _"Couldn't lock this week, try again."_ and the pill returns
      to idle so I can retry.

## Technical Notes

- Mirror `009`'s `ClearPicksControl` structure exactly (state names, focus handling, `Escape`
  listener, `role`/`aria-label` shape).
- "Lock it in" disabled/loading while `isLocking`.
- The "dismiss on pick/un-pick" rule: `PlanPage` passes a key or effect that resets
  `isConfirming` when `selections` changes.

## Dependencies

### Requires

- 001-lock-in-this-week-action

### Enables

- 003-locked-view-reword
- 006-lock-flow-tests

## Edge Cases

| Scenario                                                 | Expected Behavior                                    |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Double-click "Lock it in"                                | Mutation guarded by `isLocking`; fires once          |
| `lock_weekly_plan` rejects because selections ≠ 3 (race) | Same error alert; pill returns to idle               |
| Network slow, user presses `Escape` mid-flight           | `Escape` ignored while `isLocking`; wait for resolve |

## Out of Scope

- The locked banner content (story 003)
- Retry/backoff beyond "press again"
