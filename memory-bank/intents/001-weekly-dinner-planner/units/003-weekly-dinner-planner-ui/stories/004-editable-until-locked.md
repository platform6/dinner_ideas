---
id: 004-editable-until-locked
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 004-editable-until-locked

## User Story

**As a** wife who has picked (or is still picking) this week's dinners
**I want** my plan to stay fully editable until I actually send the shopping list, and become clearly read-only once I do
**So that** I can keep changing my mind through the week without worrying about "locking in" too early, while still trusting the plan is final once it's been texted

## Acceptance Criteria

- [ ] **Given** my current plan is unlocked, **When** I view it, **Then** I can add, remove, or swap any of its (up to 3) selections
- [ ] **Given** my plan is unlocked and has exactly 3 dinners, **When** I view it, **Then** I can still change any pick before copying the shopping list
- [ ] **Given** my plan is locked (its shopping list was copied), **When** I view it, **Then** it's shown read-only — no add/remove/swap actions are offered
- [ ] **Given** a locked plan exists for this week, **When** I want to change something, **Then** the UI makes clear the only path forward is starting next week's plan (no editing the locked one)

## Technical Notes

- "Locked" is derived from `weekly_plans.locked_at IS NOT NULL` (from `002-weekly-planning`) — the UI reads this field to decide whether to render the editable selection view or the read-only summary view.
- Handle and surface any DB rejection gracefully (e.g. a stray attempt to edit a plan that became locked in another tab) with a plain-language error, per `coding-standards.md` error handling.

## Dependencies

### Requires
- 003-pick-three-dinners
- 001-weekly-plan-schema, 002-enforce-exactly-three-immutable (from `002-weekly-planning`)

### Enables
- 005-generate-shopping-list

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Plan gets locked (e.g. shopping list copied) while this screen is open | Next action against it is rejected by the DB; UI shows a clear message and switches to the read-only view |
| No plan exists yet for the upcoming week | Treated as an empty/unlocked draft — first selection creates it |

## Out of Scope

- The lock action itself — that's triggered by copying the shopping list, see `006-copy-shopping-list-to-clipboard`
