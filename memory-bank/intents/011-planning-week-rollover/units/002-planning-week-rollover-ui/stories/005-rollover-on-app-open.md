---
id: 005-rollover-on-app-open
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
status: draft
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 047-planning-week-rollover-ui
implemented: false
---

# Story: 005-rollover-on-app-open

## User Story

**As a** household member opening the app in a new week
**I want** the catalog to start fresh for the new planning week
**So that** planning each week is the natural flow, with nothing to clear first

## Acceptance Criteria

- [ ] **Given** the app/route mounts, **When** the current planning week is computed, **Then**
      it is derived from `todayIsoDate()` + `week_start_day` at that moment and is **not**
      memoised across a reload.
- [ ] **Given** the app is left open across the week boundary, **When** no reload happens,
      **Then** it keeps showing the old week — there is **no** timer, `setInterval`,
      `visibilitychange`, or midnight listener.
- [ ] **Given** `useWeekByOffset`, **When** there is no current plan, **Then** its anchor
      fallback is `currentPlanningWeekStart(weekStartDay)` (was `todayIsoDate()`), so offset 0
      is the current planning week and negative offsets step in true 7-day increments.
- [ ] **Given** the local date has crossed into the new planning week, **When** I next open /
      reload the app, **Then**: the catalog shows the new window label (story 004) and
      `0 of 3`; `/plan` at offset 0 shows the new week; the previous week is reachable at
      offset −1 with its (locked or unlocked) picks intact.
- [ ] **Given** a first pick after rollover, **When** it is made, **Then** it creates a plan
      for the new week (story 003), leaving the previous week's plan untouched.

## Technical Notes

- "Not memoised across reload" is the natural state — just don't cache the computed start in
  `localStorage`/module scope. A `useMemo` keyed on `todayIsoDate()` within a mount is fine.
- The query-key inclusion of the planning-week start (story 002) is what makes the post-reload
  fetch land on the new week.

## Dependencies

### Requires

- 001-planning-week-date-helpers
- 002-week-aware-current-plan
- 004-catalog-planning-window-label

### Enables

- 006-rollover-regression-tests

## Edge Cases

| Scenario                                                 | Expected Behavior                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| App open at 23:59, reload at 00:01 on the week-start day | Second load shows the new, empty week                                                               |
| Device clock is wrong                                    | Feature follows the device clock (accepted — local time, no server check)                           |
| Traveller changes timezone mid-week                      | Window follows the device's local date; may shift by a day (accepted — single-family, no stored tz) |

## Out of Scope

- A live in-session flip at midnight (explicitly out of scope for the intent)
- Server-side "current week" (there is none)
