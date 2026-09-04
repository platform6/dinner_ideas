---
id: 003-locked-view-reword
unit: 001-explicit-plan-locking-ui
intent: 012-explicit-plan-locking
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 043-explicit-plan-locking-ui
implemented: true
---

# Story: 003-locked-view-reword

## User Story

**As a** household member who has locked the week
**I want** the locked page to tell me plainly that the week is committed and saved
**So that** I understand what locking did now that it's separate from the shopping list

## Acceptance Criteria

- [ ] **Given** the current planning week's plan is locked, **When** I view `/plan`, **Then**
      the locked banner reads _"This week's plan is locked in — saved to your history."_
      (replacing the current _"This plan is locked — its shopping list has already been
      sent…"_ wording).
- [ ] **Given** the locked banner is shown, **When** it renders, **Then** it includes the week
      range via `formatWeekRange(plan.start_date)`.
- [ ] **Given** the plan is locked, **When** I view `/plan`, **Then** the existing read-only
      behaviour is unchanged — no per-row remove buttons, no add-from-catalog into this plan.
- [ ] **Given** a **past** locked week (offset ≠ 0), **When** I view it, **Then** its existing
      past-week locked message is unchanged (this reword targets the current-week locked
      banner only).
- [ ] _(Could)_ **Given** intent `011` has shipped (a planning-week helper is present),
      **When** the locked banner renders, **Then** an optional secondary line _"Your next week
      opens {date}."_ is shown; **otherwise** it is omitted.

## Technical Notes

- Single string change plus the `formatWeekRange` insert in `PlanPage.tsx`'s
  `isCurrentWeek && isLocked` branch (around `PlanPage.tsx:132`).
- The "next week opens" line is `Could` priority — gate it on a feature check, don't hard-couple
  to `011`.

## Dependencies

### Requires

- 002-inline-lock-confirm (success path lands here)

### Enables

- 006-lock-flow-tests

## Edge Cases

| Scenario                                             | Expected Behavior              |
| ---------------------------------------------------- | ------------------------------ |
| Locked plan with 0 visible selections (data anomaly) | Banner still renders; no crash |

## Out of Scope

- Any change to past-week rendering
- The `011` "next week opens" date computation (only consume it if present)
