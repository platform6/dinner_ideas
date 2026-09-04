---
id: 006-lock-flow-tests
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 044-explicit-plan-locking-ui
implemented: true
---

# Story: 006-lock-flow-tests

## User Story

**As a** developer maintaining the weekly-plan and shopping-list features
**I want** the lock decoupling covered by tests
**So that** a future change can't silently re-couple locking to copy or break the confirm

## Acceptance Criteria

- [ ] **Given** `LockWeekControl.test.tsx` (new), **When** it runs, **Then** it covers:
      renders the quiet button for a 3-selection unlocked current week; renders nothing at 0–2
      selections; pressing it opens the confirm pill with the exact copy; `Escape` and "Keep
      editing" both dismiss; "Lock it in" calls `onLock` exactly once; `isLocking` shows the
      spinner on "Lock it in".
- [ ] **Given** `PlanPage.test.tsx` (extended), **When** it runs, **Then** it covers: button
      visibility rule (current week + unlocked + exactly 3); a successful lock renders the
      reworded locked banner with the week range; a failed lock shows the error alert and
      restores the pill; the FR-6 helper-line states.
- [ ] **Given** `ShoppingListPage.test.tsx` (updated), **When** it runs, **Then** it covers:
      copying **never** invokes a lock mutation (the hook is not imported/spied); success text
      is _"Copied!"_; the story-005 note shows for an unlocked 3-pick current week and is
      absent when locked; both responsive layouts still render.
- [ ] **Given** the full suite, **When** CI runs, **Then** existing `weekly-plan`,
      `shopping-list`, and `cooking-view` tests pass unchanged except where the assertions
      above intentionally replace lock-coupled ones.
- [ ] **Given** the lock path, **When** exercised in tests, **Then** the existing
      `meal_history`-on-lock coverage (or its mock boundary) still asserts the lock RPC is
      called — behaviour unchanged, only the trigger page moved.

## Technical Notes

- Prefer spying on `useLockPlan` to assert call counts rather than hitting a real Supabase
  mock.
- Reuse `009`'s `ClearPicksControl.test.tsx` structure for `LockWeekControl.test.tsx`.

## Dependencies

### Requires

- 001-lock-in-this-week-action
- 002-inline-lock-confirm
- 003-locked-view-reword
- 004-shopping-list-lock-decoupled
- 005-not-locked-yet-nudge

### Enables

- None (last story of the unit)

## Edge Cases

| Scenario                                         | Expected Behavior                            |
| ------------------------------------------------ | -------------------------------------------- |
| A test still importing the removed lock checkbox | Fails fast; updated or deleted in this story |

## Out of Scope

- E2E / browser tests (unit + component level only, matching the project's current setup)
