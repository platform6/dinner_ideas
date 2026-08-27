---
id: 013-week-navigation-view
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: should
created: '2026-08-27T01:00:00Z'
assigned_bolt: 013-weekly-dinner-planner-ui
implemented: true
---

# Story: 013-week-navigation-view

## User Story

**As a** wife planning dinners
**I want** to browse past and current weeks one at a time, Blue Apron–style
**So that** I can see what we've already eaten and not just the current week

## Acceptance Criteria

- [ ] **Given** the week view, **When** it loads, **Then** it shows the current/latest week's date range (e.g. "8/23 – 8/29") with ◀ and ▶ controls
- [ ] **Given** the current week is shown, **When** I click ◀, **Then** the previous week's plan loads and displays, read-only
- [ ] **Given** I've navigated to a past week, **When** I click ▶ repeatedly, **Then** I move forward one week at a time back toward, and stopping at, the current/latest plan (▶ is disabled or no-ops past that point)
- [ ] **Given** a past, locked week with `meal_history` rows, **When** viewed, **Then** it's visually marked as "eaten" (distinct from the current in-progress plan's styling)
- [ ] **Given** a week with no plan at all (e.g. a week that was skipped), **When** navigated to, **Then** it shows a clear "no plan this week" state rather than an error

## Technical Notes

- Builds on `002-weekly-planning`'s "get week by offset" operation (from `004-meal-history-schema`'s unit-brief) — needs a query for "the plan whose `start_date` is N weeks from a reference date", not just `fetchCurrentPlan`'s "most recent" query.
- This is a _view_ of past plans, not an editor — past weeks render read-only (no toggle-selection controls), current/latest week keeps today's editable pick-3 behavior.
- Per the deferred real-time/optimistic redesign (see `requirements.md` Open Questions), this story does NOT change how picking itself feels — only adds the ability to look backward/forward.

## Dependencies

### Requires

- `004-meal-history-schema` (unit 002)
- `002-enforce-exactly-three-immutable` (existing lock semantics this reads)

### Enables

- Fuller FR-11 experience; future UX Inception pass (deferred pick-flow redesign) can build on this view

## Edge Cases

| Scenario                                                             | Expected Behavior                                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No weekly plans exist at all yet (brand-new household)               | Week view shows today's (empty) week with ▶ /◀ effectively no-ops in both directions                                                                                           |
| Rapidly clicking ◀ multiple times before the previous fetch resolves | Navigation doesn't skip weeks or race — same in-flight-guard pattern already used for pick-3 (see `CatalogPage.tsx`'s `selectionDisabled` comment) applies here for the arrows |

## Out of Scope

- Any change to the pick-3 flow's real-time feel (explicitly deferred to a future UX Inception pass)
- Editing a past week's selections (past weeks are read-only)
