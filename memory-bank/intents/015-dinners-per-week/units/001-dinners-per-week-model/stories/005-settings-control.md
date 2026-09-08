---
id: 005-settings-control
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
status: planned
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 064-dinners-per-week-setting-ui
implemented: false
---

# Story: 005-settings-control

## User Story

**As a** household owner
**I want** to set how many dinners we plan each week
**So that** I can change it without a developer

## Acceptance Criteria

- [ ] **Given** `/settings`, **When** an owner views it, **Then** a control for the number of
      dinners per week sits with the other household settings.
- [ ] **Given** the control, **When** used, **Then** only values 1–7 can be chosen, so the DB
      `check` is never reached with a bad value.
- [ ] **Given** a member who is not an owner, **When** they view the page, **Then** the value is
      visible but not editable — matching the existing owner-UPDATE policy rather than duplicating
      its logic in the client.
- [ ] **Given** a change, **When** saved, **Then** it takes effect immediately for an unlocked
      current week.
- [ ] **Given** a failed save, **When** it returns, **Then** a short user-facing message appears and
      the displayed value returns to what is actually stored.

## Technical Notes

- `week_start_day`'s control (intent 011, bolt 045) is the pattern: same page, same ownership rule,
  same shape of write. Follow it rather than inventing a second settings idiom.
- Consider stating the consequence next to the control — that the plan, shopping list and cooking
  view all follow this number — since it is not obvious that one setting moves four screens.

## Dependencies

### Requires

- 001-dinners-per-week-column

### Enables

- Unit 002

## Out of Scope

- The client sites that read the value (unit 002)
