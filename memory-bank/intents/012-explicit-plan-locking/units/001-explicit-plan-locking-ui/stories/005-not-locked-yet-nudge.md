---
id: 005-not-locked-yet-nudge
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
status: complete
priority: should
created: '2026-09-03T22:55:00Z'
assigned_bolt: 044-explicit-plan-locking-ui
implemented: true
---

# Story: 005-not-locked-yet-nudge

## User Story

**As a** household member who copied the list but hasn't locked the week
**I want** a gentle reminder that locking is a separate step
**So that** my week still gets saved to history without forcing me to lock right now

## Acceptance Criteria

- [ ] **Given** the current planning week's plan exists, is **not** locked, and has 3
      selections, **When** I am on the Shopping List page, **Then** a small `Text` note shows
      directly below the Copy button: _"This week isn't locked in yet — lock it on This Week to
      save it to your history."_ with a link to `/plan`.
- [ ] **Given** the plan is already locked, **When** the page renders, **Then** the note is
      **not** shown.
- [ ] **Given** the note is shown, **When** I press "Copy shopping list", **Then** the copy
      still succeeds and shows _"Copied!"_ — the note never blocks or changes the copy.
- [ ] **Given** the note, **When** it renders, **Then** it uses a neutral style (no red / no
      error treatment) and may appear before the first copy.
- [ ] **Given** I click the link, **When** it activates, **Then** I navigate to `/plan` (via
      `RouterLink`, not a full reload).

## Technical Notes

- Uses `plan?.locked_at == null` + `selections.length === 3` (both already available in
  `ShoppingListPage` after story 004).
- No `aria-live` needed — it is static, not a response to an action.
- Place it in the same region for both responsive layouts.

## Dependencies

### Requires

- 004-shopping-list-lock-decoupled

### Enables

- 006-lock-flow-tests

## Edge Cases

| Scenario                                  | Expected Behavior                       |
| ----------------------------------------- | --------------------------------------- |
| Fewer than 3 selections (plan incomplete) | No note (you can't lock yet anyway)     |
| Viewing a past week's list                | No note (not the current planning week) |

## Out of Scope

- The near-week-end "lock before rollover" nudge (deferred; needs `011`)
- Any change to copy behaviour
