---
id: 004-cooking-steps-editor
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: complete
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 059-recipe-draft-form
implemented: true
---

# Story: 004-cooking-steps-editor

## User Story

**As a** household member adding a dinner
**I want** to write out the steps for cooking it
**So that** the cooking view works for this dinner exactly as it does for the founding fifty

## Acceptance Criteria

- [ ] **Given** the form, **When** steps are entered, **Then** they are an ordered list that can be
      added to, edited, removed from and reordered.
- [ ] **Given** a dinner with no steps, **When** save is attempted, **Then** it is refused. Every
      one of the 50 founding dinners has 4 or 5 steps; a dinner with none would be the only one
      showing "No steps available for this dinner yet." in the cooking view.
- [ ] **Given** a middle step is removed, **When** the list re-renders, **Then** the remaining
      steps are renumbered contiguously from 1, so `check (step_number > 0)` and
      `unique (dinner_id, step_number)` are never reached with a bad value.
- [ ] **Given** steps are reordered, **When** saved, **Then** `step_number` reflects the displayed
      order — the order shown is the order stored.
- [ ] **Given** the steps section, **When** it renders, **Then** 4–5 steps is offered as the house
      norm — guidance, not a limit. A six-step recipe is not rejected.

## Technical Notes

- `dinner_steps` is `(dinner_id, step_number, instruction)` with `unique (dinner_id, step_number)`.
  The schema comment permits non-contiguous numbering; all founding data is contiguous, so keep it.
- The founding voice is terse and imperative, with the detail that makes a step usable:
  "Spread on a sheet pan and roast for 30 minutes, until the chicken is cooked through."
- This editor is the surface unit 002's extracted steps land in, so it must handle 4–5 typical
  entries and a longer list without becoming unusable.

## Dependencies

### Requires

- 001-recipe-entry-route

### Enables

- 005-atomic-save
- Unit 002's review step (FR-7)

## Edge Cases

| Scenario          | Expected Behavior                                                    |
| ----------------- | -------------------------------------------------------------------- |
| A single step     | Allowed — unusual, but not wrong                                     |
| A step left blank | Refused on save; an empty instruction renders as a blank line        |
| Ten steps         | Allowed; the norm is guidance, and imports may legitimately run long |

## Out of Scope

- Rich text, timers, or per-step ingredients — `dinner_steps.instruction` is plain text
