---
id: 001-lock-in-this-week-action
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 043-explicit-plan-locking-ui
implemented: true
---

# Story: 001-lock-in-this-week-action

## User Story

**As a** household member who has picked this week's 3 dinners
**I want** a clear "Lock in this week" button on the This Week page
**So that** I can deliberately commit the week and save it to my history, without going
through the shopping list

## Acceptance Criteria

- [ ] **Given** I am on `/plan` viewing the current planning week with exactly 3 selections
      and the plan is not locked, **When** the page renders, **Then** a primary
      **"Lock in this week"** button (with a lock glyph) appears in the page header, plus a
      context line: _"Locks these 3 dinners and adds them to your history. You can still shop
      your list either way."_
- [ ] **Given** the current week has 0–2 selections and is unlocked, **When** the page
      renders, **Then** no lock button is shown and a calm helper line reads _"Pick 3 dinners
      to lock in your week."_
- [ ] **Given** the plan is already locked, **When** the page renders, **Then** no lock button
      or "pick 3" helper line is shown (the locked banner from story 003 shows instead).
- [ ] **Given** I am viewing a **past** week (offset ≠ 0), **When** the page renders, **Then**
      no lock button and no helper line appear (existing past-week rendering unchanged).
- [ ] **Given** the button is shown, **When** I press it, **Then** the inline confirm (story 002) opens — it does **not** lock immediately.

## Technical Notes

- `PlanPage.tsx` already derives `isCurrentWeek`, `isLocked`, `isFull` (`selections.length
=== 3`) — reuse them for the visibility rule.
- New `LockWeekControl.tsx`, prop-driven `{ selectionCount, onLock, isLocking? }`; it owns
  only `isConfirming`. The parent (`PlanPage`) owns the `useLockPlan` mutation.
- Add `uiIcons.lock` (Lucide `Lock`) to the icon barrel if absent.
- Button style: primary, consistent with other `/plan` header actions; no per-instance focus
  styling (global ring).

## Dependencies

### Requires

- None (first story of the unit)

### Enables

- 002-inline-lock-confirm
- 003-locked-view-reword

## Edge Cases

| Scenario                                                             | Expected Behavior                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Selections change 3 → 2 while the button is visible (not confirming) | Button disappears; helper line returns to "Pick 3 dinners…" |
| Plan becomes locked in another tab, query refetches                  | Button disappears; locked banner (story 003) renders        |

## Out of Scope

- The confirm interaction itself (story 002)
- The locked banner wording (story 003)
- Any shopping-list change (stories 004, 005)
