---
id: 002-lucky-control
unit: 001-lucky-pick
intent: 016-feeling-lucky
status: planned
priority: must
created: '2026-09-07T04:10:00Z'
assigned_bolt: 066-lucky-pick
implemented: false
---

# Story: 002-lucky-control

## User Story

**As a** household member staring at the catalog
**I want** one button that fills the rest of the week
**So that** I stop scrolling and go cook

## Acceptance Criteria

- [ ] **Given** the catalog, **When** it renders, **Then** a lucky control is present.
- [ ] **Given** a week with some picks, **When** the control is pressed, **Then** exactly
      `dinners_per_week - (current picks)` dinners are added and existing picks are untouched.
- [ ] **Given** existing picks, **When** candidates are gathered, **Then** they are excluded — the
      same dinner is never picked twice in a week.
- [ ] **Given** suppressed dinners (`is_active = false`), **When** candidates are gathered, **Then**
      they are excluded. Suppression is a user decision and randomness must not overrule it.
- [ ] **Given** a full week, a locked plan, or no eligible candidates, **When** the control renders,
      **Then** it is disabled **and the reason is visible** — not merely inert.
- [ ] **Given** fewer eligible dinners than empty slots, **When** pressed, **Then** it fills what it
      can and says plainly that it ran out.
- [ ] **Given** the writes, **When** they run, **Then** they go through the ordinary selection path,
      so intent 015's cap trigger applies exactly as for a hand-picked dinner.
- [ ] **Given** a failure partway through the fill, **When** it returns, **Then** the picks that
      succeeded remain, and the user is told what happened.

## Technical Notes

- No confirmation dialog: the action is non-destructive by design, which is the main reason for
  filling rather than replacing.
- Intent 009 already ships an explicit Clear Picks action. A user wanting a full re-roll clears,
  then presses lucky — two deliberate actions rather than one ambiguous one.
- The cap is the trigger's job. This control computes how many slots to fill for the UI's sake, but
  must not treat its own arithmetic as the guarantee.

## Dependencies

### Requires

- 001-weighted-draw
- Intent 015 unit 001 (`dinners_per_week`)

### Enables

- 003-lucky-tests

## Edge Cases

| Scenario                                | Expected Behavior                                      |
| --------------------------------------- | ------------------------------------------------------ |
| Setting lowered below the current picks | No empty slots; control disabled with the reason shown |
| Plan locked mid-press                   | The trigger rejects the write; the failure is reported |
| Every dinner suppressed                 | Disabled, saying there is nothing to pick from         |

## Out of Scope

- Replacing existing picks
