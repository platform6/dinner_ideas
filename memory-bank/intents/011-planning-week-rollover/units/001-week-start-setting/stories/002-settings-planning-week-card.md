---
id: 002-settings-planning-week-card
unit: 001-week-start-setting
intent: 011-planning-week-rollover
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 045-week-start-setting
implemented: true
---

# Story: 002-settings-planning-week-card

## User Story

**As a** household owner
**I want** to choose which weekday my dinner plan starts on, from the Settings page
**So that** the week rolls over when it actually suits my shopping routine

## Acceptance Criteria

- [ ] **Given** I am an owner on `/settings`, **When** the page renders, **Then** a "Planning
      week" card (sibling of the AI card) shows a 7-option weekday control (Sunday…Saturday)
      set to the household's current `week_start_day`.
- [ ] **Given** I am an owner, **When** I pick a different weekday, **Then** it is saved via a
      direct `update` on `households`, the control reflects the new value, and the change
      persists across a reload.
- [ ] **Given** I am a **non-owner** member, **When** I view the card, **Then** I see the
      current weekday but the control is **disabled**, with a short note that only an owner can
      change it (matching the AI card's owner-gating).
- [ ] **Given** the update fails, **When** the error returns, **Then** an inline error message
      shows and the control reverts to the previously-saved value.
- [ ] **Given** the card, **When** it renders, **Then** helper text states the effect: _"Your
      dinner plan starts fresh each {weekday}."_ and _"Changing this affects the current week
      immediately."_
- [ ] **Given** no household has ever set this, **When** any member loads the app, **Then**
      everything works against the Sunday (`0`) default (FR-8) — no blocking, no empty control.

## Technical Notes

- `useHouseholdSettings()` read + `useUpdateWeekStartDay()` mutation in the settings feature;
  the mutation invalidates the settings query **and** the planning-week-keyed plan queries so
  a mid-week change re-derives the window on next render (Unit 2 consumes this).
- Owner check from `useAuth` (`role === 'owner'`) for enable/disable — RLS is the real
  boundary (story 001).
- Weekday labels: `['Sunday','Monday',...,'Saturday']`, index === stored value.

## Dependencies

### Requires

- 001-week-start-day-column

### Enables

- (Unit 2) 002-week-aware-current-plan (a mid-week change must re-key the plan query)

## Edge Cases

| Scenario                                 | Expected Behavior                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Owner changes weekday mid-week           | Current planning-window recomputes on next render/invalidation; no data migration of existing plans |
| Two owners change it near-simultaneously | Last write wins; each client re-reads on invalidation                                               |
| `useAuth` role still loading             | Control renders disabled until role resolves                                                        |

## Out of Scope

- The date math / rollover that consumes the value (Unit 2)
- Any migration change (story 001)
