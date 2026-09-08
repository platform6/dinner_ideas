---
id: 003-lock-honours-setting
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
status: planned
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 063-dinners-per-week-rule
implemented: false
---

# Story: 003-lock-honours-setting

## User Story

**As a** household member locking the week
**I want** locking to require our number of dinners
**So that** a week of five locks when five are picked

## Acceptance Criteria

- [ ] **Given** a household set to N, **When** a plan with exactly N selections is locked, **Then**
      it locks.
- [ ] **Given** fewer or more than N, **When** locking is attempted, **Then** it is rejected with a
      message stating the number actually required.
- [ ] **Given** the setting is lowered below an unlocked plan's selection count, **When** locking is
      attempted, **Then** it is refused and says the extra picks must be removed first — in those
      words, not as a bare count mismatch.
- [ ] **Given** an already-locked plan, **When** the setting changes, **Then** nothing about that
      plan changes. Locking is deliberate (intent 012) and its `meal_history` rows are written.
- [ ] **Given** the function `fn_weekly_plans_require_three_on_lock`, **When** this story lands,
      **Then** it is **renamed** — it asserts in its name the very constant being removed — and the
      old name is explicitly dropped rather than left behind.

## Technical Notes

- `fn_weekly_plans_record_meal_history` runs after this trigger and is **already N-agnostic**: it
  inserts one row per selection via a `select`. Its logic needs no change. Its comment claims
  "Writes 3 meal_history rows" and should be corrected in the same migration — a comment that lies
  is worse than no comment.
- Renaming a function means dropping and recreating its trigger. Do both in one migration and
  document the down-path as every prior migration in this project does.

## Dependencies

### Requires

- 001-dinners-per-week-column

### Enables

- 004-rule-tests

## Out of Scope

- Changing what locking _means_ — intent 012 owns that
