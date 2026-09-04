---
id: 004-shopping-list-lock-decoupled
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 044-explicit-plan-locking-ui
implemented: true
---

# Story: 004-shopping-list-lock-decoupled

## User Story

**As a** household member copying my shopping list
**I want** copying to just copy
**So that** I'm not silently committing my week as a side effect

## Acceptance Criteria

- [ ] **Given** `ShoppingListPage.tsx`, **When** the change is complete, **Then** the "Also
      lock this week's plan" `Checkbox`, the `lockChecked` / `shouldLock` state, the
      `useLockPlan` import, the `lockPlan.mutateAsync` call in `handleCopy`, and the
      `lockErrorMessage` state and its rendered branches are **all removed**.
- [ ] **Given** I press "Copy shopping list", **When** `handleCopy` runs, **Then** it only
      writes `text` to the clipboard and reports the outcome — no mutation of any kind.
- [ ] **Given** a successful copy, **When** the result renders, **Then** the message is
      _"Copied!"_ with no lock-state wording; the _"…This week's plan is locked in."_ fragments
      are gone.
- [ ] **Given** the plan is locked **or** unlocked, **When** the page renders, **Then** it
      looks the same except for story 005's note — both responsive layouts (header-controls at
      md+, stacked on phone) still render and copy correctly.
- [ ] **Given** the existing `ShoppingListPage` tests, **When** they run, **Then** they are
      updated to the no-lock behaviour and pass (story 006 owns the full test pass).

## Technical Notes

- Touch points from the current file: import (line ~20), `useLockPlan()` call (~39),
  `isAlreadyLocked` / `lockChecked` / `shouldLock` (~43–45), `lockErrorMessage` (~53),
  `handleCopy` lock block (~115–123), `lockCheckbox` JSX (~129–137), header + stacked
  placements (~164, ~286), success-copy branches (~251–262).
- Keep `plan?.locked_at` available — story 005 needs it to decide whether to show the nudge.

## Dependencies

### Requires

- None (independent of the `/plan` stories; grouped into bolt 044)

### Enables

- 005-not-locked-yet-nudge
- 006-lock-flow-tests

## Edge Cases

| Scenario                               | Expected Behavior                                             |
| -------------------------------------- | ------------------------------------------------------------- |
| `navigator.clipboard.writeText` throws | Existing `clipboardOk = false` path unchanged; still no lock  |
| No current plan                        | Copy button behaves as today (guarded by `if (!plan) return`) |

## Out of Scope

- The nudge text/placement (story 005)
- Anything on `/plan`
