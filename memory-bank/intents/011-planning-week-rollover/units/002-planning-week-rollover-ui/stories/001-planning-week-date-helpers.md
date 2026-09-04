---
id: 001-planning-week-date-helpers
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
status: complete
priority: must
created: '2026-09-03T22:55:00Z'
assigned_bolt: 046-planning-week-rollover-ui
implemented: true
---

# Story: 001-planning-week-date-helpers

## User Story

**As a** developer wiring up the planning week
**I want** a pure function that maps "today + a week-start weekday" to the planning week's
start date
**So that** every consumer computes the same window with no timezone or DST surprises

## Acceptance Criteria

- [ ] **Given** `planningWeekStart(isoDate, weekStartDay)` in `weekly-plan/date.ts`, **When**
      called with a `YYYY-MM-DD` string and a weekday `0..6`, **Then** it returns the most
      recent date **≤** `isoDate` whose weekday === `weekStartDay` (the same date when
      `isoDate` already falls on that weekday).
- [ ] **Given** the implementation, **When** it computes, **Then** it uses only whole-date
      local math (reusing `parseLocalDate` / `toIsoDate`) — no `Date.UTC`, no `getTimezone*`,
      no hour arithmetic.
- [ ] **Given** `currentPlanningWeekStart(weekStartDay)`, **When** called, **Then** it returns
      `planningWeekStart(todayIsoDate(), weekStartDay)`.
- [ ] **Given** `date.test.ts`, **When** it runs, **Then** it covers: `isoDate` exactly on the
      week-start weekday; the day before and the day after; **all seven** `weekStartDay`
      values; a case that crosses a month boundary; a case that crosses a year boundary; a
      date inside a spring-forward and a fall-back DST week — each asserting a 7-calendar-day
      window.
- [ ] **Given** any `(isoDate, weekStartDay)`, **When** called twice, **Then** the result is
      identical (pure / deterministic).

## Technical Notes

- `new Date(y, m-1, d).getDay()` gives the local weekday 0–6 (Sun–Sat) — matches the stored
  convention.
- Walk back `(( currentDay - weekStartDay + 7 ) % 7)` days.

## Dependencies

### Requires

- (Unit 1) 001-week-start-day-column — the value's shape/range

### Enables

- 002-week-aware-current-plan
- 003-week-aligned-plan-creation
- 004-catalog-planning-window-label
- 005-rollover-on-app-open

## Edge Cases

| Scenario                                   | Expected Behavior                                           |
| ------------------------------------------ | ----------------------------------------------------------- |
| `isoDate` is itself the week-start weekday | Returns `isoDate` unchanged                                 |
| DST spring-forward on the week-start day   | Still a 7-calendar-day window (no hour math, so unaffected) |
| Leap day inside the window                 | Handled by `Date` date arithmetic                           |

## Out of Scope

- Any consumer wiring (later stories)
- `formatWeekRange` (unchanged, reused as-is)
