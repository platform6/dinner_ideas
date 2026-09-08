---
id: 001-dinners-per-week-column
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
status: complete
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 063-dinners-per-week-rule
implemented: true
---

# Story: 001-dinners-per-week-column

## User Story

**As a** household that cooks more (or fewer) than three dinners a week
**I want** the number to be ours to set
**So that** the app plans the week we actually cook

## Acceptance Criteria

- [ ] **Given** the migration, **When** applied, **Then** `households.dinners_per_week smallint
  not null default 3 check (dinners_per_week between 1 and 7)` exists.
- [ ] **Given** existing households, **When** the migration runs, **Then** every one takes the
      default 3 and no behaviour changes — this deploy is a no-op until someone changes a setting.
- [ ] **Given** RLS, **When** reviewed, **Then** **no new policy is added**. `households` already
      carries member-SELECT and owner-UPDATE from `20260828230000`, which cover a new column
      exactly as they cover `week_start_day`.
- [ ] **Given** the column, **When** created, **Then** it carries a `comment on column` in the
      house style, explaining the range and who edits it.

## Technical Notes

- `20260904020000_households_week_start_day.sql` is the template — read it first and follow it.
- 1–7 because a week has seven days. The ceiling is a sanity bound, not a product opinion.

## Dependencies

### Requires

- None

### Enables

- 002-selection-cap-honours-setting, 003-lock-honours-setting, 005-settings-control

## Out of Scope

- Reading the value anywhere (that is the rest of this intent)
