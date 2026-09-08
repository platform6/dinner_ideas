---
id: 001-scope-index-to-week
unit: 001-plan-uniqueness-scope
intent: 017-plan-rollover-remediation
status: complete
priority: must
created: '2026-09-08T00:00:00Z'
assigned_bolt: 067-plan-uniqueness-scope
implemented: true
---

# Story: 001-scope-index-to-week

## User Story

**As a** household member starting a new week
**I want** to pick dinners even though last week's plan was never locked
**So that** the app does not lock me out of its main action every time I forget to lock a week

## Acceptance Criteria

- [ ] **Given** the migration, **When** applied, **Then** `idx_weekly_plans_one_unlocked` is
      `unique (household_id, start_date) where locked_at is null`, retaining `nulls not distinct`.
- [ ] **Given** an unlocked plan for an earlier week, **When** a plan for the current week is
      created, **Then** it succeeds. This is the production scenario.
- [ ] **Given** an unlocked plan for a week, **When** a second plan for **that same week** is
      created, **Then** it is rejected — bolt 027's protection, correctly scoped.
- [ ] **Given** production data, **When** the migration runs, **Then** it applies without
      remediation: the change only widens, so no existing row can violate it.
- [ ] **Given** the index comment, **When** read after this change, **Then** it describes the rule
      that now exists. The current one states the rule being removed.

## Technical Notes

- Current definition, from `20260828231000_account_model_household_id_columns.sql`:
  `unique index on weekly_plans (household_id) nulls not distinct where locked_at is null`
- `nulls not distinct` must survive: intent 004's null-household window relies on it, and its
  comment explains why.
- Document the down-path as every migration in this project does.

## Dependencies

### Requires

- None

### Enables

- 002-uniqueness-tests

## Edge Cases

| Scenario                                     | Expected Behavior                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two unlocked drafts for different past weeks | Permitted after this change; neither blocks the other                                                                                                                                                                                                              |
| A locked plan for the same week              | Exempt — the index only covers `locked_at is null`. An unlocked plan may still be created for a week that already has a locked one; production already contains such a pair (2026-08-30), and `fetchPlanByStartDate` resolves it by newest. **Do not forbid this** |
| `household_id` null (the intent 004 window)  | `nulls not distinct` keeps prior behaviour                                                                                                                                                                                                                         |

## Out of Scope

- Anything about what the app _does_ with an old unfinished draft
