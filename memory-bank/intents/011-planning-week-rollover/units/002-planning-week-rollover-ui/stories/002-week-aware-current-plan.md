---
id: 002-week-aware-current-plan
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 046-planning-week-rollover-ui
implemented: true
---

# Story: 002-week-aware-current-plan

## User Story

**As a** household member opening the app
**I want** the app's "current plan" to mean _this planning week's plan_
**So that** I never see last week's picks lingering as if they were this week's

## Acceptance Criteria

- [ ] **Given** `useCurrentPlan()`, **When** it fetches, **Then** it resolves the plan whose
      `start_date === currentPlanningWeekStart(weekStartDay)` via `fetchPlanByStartDate` — not
      "newest `weekly_plans` by `created_at`".
- [ ] **Given** no `weekly_plans` row exists for the current planning week, **When**
      `useCurrentPlan()` resolves, **Then** it returns `null` (not an older plan).
- [ ] **Given** an older **unlocked** plan exists for a previous week, **When** the catalog
      renders, **Then** its selections do **not** populate the grid (`selectedDinnerIds` is
      empty because `plan` is `null`).
- [ ] **Given** the query, **When** it is keyed, **Then** the key includes the current
      planning-week start so a rollover-on-open (story 005) or a settings change (Unit 1 story 002) produces a fresh fetch.
- [ ] **Given** the four `useCurrentPlan` consumers — `CatalogPage`, `PlanPage` (offset 0),
      `ShoppingListPage`, `CookingViewPage` — **When** the audit is done, **Then** each is
      confirmed correct under the new semantics, and any place that genuinely needs "latest
      plan regardless of week" uses a separate, explicitly-named call. The audit findings are
      recorded in the bolt's implementation notes.

## Technical Notes

- `weekStartDay` comes from `useHouseholdSettings()` (Unit 1). While it loads, `useCurrentPlan`
  should be disabled/loading rather than fetch against a guessed default.
- `fetchPlanByStartDate` already embeds `weekly_plan_selections(*, dinners(*))` — same shape
  `fetchCurrentPlan` returns, so consumers need no shape change.
- Keep `fetchCurrentPlan` (newest-by-created_at) available only if the audit finds a real need;
  otherwise deprecate it.

## Dependencies

### Requires

- 001-planning-week-date-helpers
- (Unit 1) 002-settings-planning-week-card — invalidation contract for mid-week changes

### Enables

- 003-week-aligned-plan-creation
- 004-catalog-planning-window-label
- 006-rollover-regression-tests

## Edge Cases

| Scenario                                                       | Expected Behavior                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Plan for the current week is **locked**                        | Returned as today — catalog shows empty `0 of 3` (locked → empty selections, unchanged) |
| Two plans share the current week's `start_date` (data anomaly) | `fetchPlanByStartDate` already tie-breaks on newest `created_at`                        |
| `week_start_day` still loading                                 | `useCurrentPlan` in loading state; no fetch against a default                           |

## Out of Scope

- Creating the week-aligned plan (story 003)
- The window label (story 004)
- Recompute-on-open mechanics (story 005)
