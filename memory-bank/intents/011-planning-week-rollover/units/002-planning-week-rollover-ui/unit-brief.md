---
unit: 002-planning-week-rollover-ui
intent: 011-planning-week-rollover
phase: inception
status: complete
created: '2026-09-03T22:55:00Z'
updated: '2026-09-03T22:55:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Planning-Week Rollover UI

## Purpose

Turn `week_start_day` into behaviour: a pure "planning week" date helper, a week-aware
"current plan", week-aligned plan creation, the catalog planning-window label, and rollover
recompute on app open — with a regression pass across every `useCurrentPlan` consumer.

## Scope

### In Scope

- `planningWeekStart(isoDate, weekStartDay)` + `currentPlanningWeekStart(weekStartDay)` in
  `weekly-plan/date.ts`; whole-date local math (FR-3)
- `useCurrentPlan()` resolves the plan for the current planning week via
  `fetchPlanByStartDate` — not "newest by `created_at`"; `null` when none exists (FR-4)
- `useToggleSelection` `create-and-add` stamps `createPlan(currentPlanningWeekStart(...))`;
  `todayIsoDate()` no longer used as a plan `start_date` (FR-5)
- `useWeekByOffset` anchor fallback `todayIsoDate()` → `currentPlanningWeekStart(...)` (FR-7)
- Catalog header renders `formatWeekRange(currentPlanningWeekStart(...))` (FR-6)
- Rollover recompute on app/route mount — no timers, no `visibilitychange` (FR-7)
- Consumer audit: `CatalogPage`, `PlanPage` (offset 0), `ShoppingListPage`, `CookingViewPage`
- Tests + regression (FR-9)

### Out of Scope

- The setting itself (Unit 1)
- A live in-session midnight flip
- Any "unfinished plan from last week" prompt
- Any locking change (`012`) or manual mid-week reset (`009`)
- Changing `formatWeekRange()` output

---

## Assigned Requirements

| FR   | Requirement                                | Priority |
| ---- | ------------------------------------------ | -------- |
| FR-3 | Planning-week date helper                  | Must     |
| FR-4 | Week-aware "current plan"                  | Must     |
| FR-5 | Week-aligned `start_date` on plan creation | Must     |
| FR-6 | Planning-window label on the catalog       | Must     |
| FR-7 | Rollover on app open                       | Must     |
| FR-9 | Tests & regression                         | Must     |

---

## Domain Concepts

### Key Entities

_None new._ Reinterprets `WeeklyPlan.start_date` as "the planning week this plan is for".

### Key Operations

| Operation                 | Description                                                        | Inputs                    | Outputs                |
| ------------------------- | ------------------------------------------------------------------ | ------------------------- | ---------------------- |
| `planningWeekStart`       | Most recent local date ≤ input whose weekday === `weekStartDay`    | `isoDate`, `weekStartDay` | `YYYY-MM-DD`           |
| Resolve current plan      | `fetchPlanByStartDate(currentPlanningWeekStart(weekStartDay))`     | week-start weekday        | `CurrentPlan \| null`  |
| Create plan for this week | `createPlan(currentPlanningWeekStart(weekStartDay))` on first pick | week-start weekday        | new `weekly_plans` row |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 6     |
| Must Have     | 6     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                          | Title                                                                     | Priority | Status  |
| --------------------------------- | ------------------------------------------------------------------------- | -------- | ------- |
| 001-planning-week-date-helpers    | `planningWeekStart` / `currentPlanningWeekStart` + tests                  | Must     | Planned |
| 002-week-aware-current-plan       | `useCurrentPlan` resolves by planning-week start; consumer audit          | Must     | Planned |
| 003-week-aligned-plan-creation    | `createPlan` / `useToggleSelection` stamp week-aligned `start_date`       | Must     | Planned |
| 004-catalog-planning-window-label | `formatWeekRange` window label in the catalog header                      | Must     | Planned |
| 005-rollover-on-app-open          | Recompute current planning week on mount; `useWeekByOffset` anchor change | Must     | Planned |
| 006-rollover-regression-tests     | Cross-surface regression + boundary tests                                 | Must     | Planned |

---

## Dependencies

### Depends On

| Unit                                   | Reason                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `001-week-start-setting` (this intent) | Reads `week_start_day`                                                                                            |
| `001-weekly-dinner-planner` (complete) | `weekly_plans`, `fetchPlanByStartDate`, `useWeekByOffset`, `formatWeekRange`, `CatalogPage`, `useToggleSelection` |

### Depended By

| Unit                             | Reason                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `009-clear-picks-reset` (future) | "Clear picks" operates within the current planning week |

### External Dependencies

| System               | Purpose                                         | Risk |
| -------------------- | ----------------------------------------------- | ---- |
| Supabase / PostgREST | `fetchPlanByStartDate`, `createPlan` (existing) | Low  |

---

## Technical Context

### Suggested Technology

TanStack Query (re-keyed queries), existing `weekly-plan/date.ts` helpers, Vitest. No new
dependency.

### Integration Points

| Integration                                                 | Type             | Protocol    |
| ----------------------------------------------------------- | ---------------- | ----------- |
| `weekly-plan/api.ts` (`fetchPlanByStartDate`, `createPlan`) | Consumed         | PostgREST   |
| `useCurrentPlan` consumers (4)                              | Refactor surface | React hooks |

### Data Storage

_None owned._ Query cache re-keyed by planning-week start.

---

## Constraints

- Whole-date local math only — no UTC, no hour arithmetic; DST-safe.
- Recompute on app open only — no timers/listeners.
- Reuse `formatWeekRange()` verbatim.
- Older unlocked plans stay silent — never surfaced on the catalog.
- No change to `weekly_plans` schema or to locking.

---

## Success Criteria

### Functional

- [ ] `planningWeekStart` correct for all 7 weekdays, boundary dates, month/year wrap, DST week
- [ ] Catalog shows the window label and `0 of 3` when no plan exists for the current week
- [ ] An older unlocked plan does **not** populate the catalog grid
- [ ] First pick creates a plan whose `start_date === currentPlanningWeekStart(...)` and it
      reappears after reload
- [ ] After the week boundary, first load shows the new window + empty catalog; `/plan`
      offset 0 = new week; previous week at offset −1
- [ ] A mid-week setting change re-derives the window on next render

### Non-Functional

- [ ] `/plan` week nav, `012` locking, shopping-list generation, cooking view,
      `meal_history`-on-lock all unregressed
- [ ] Existing `weekly-plan` / `dinners` / `shopping-list` / `cooking-view` suites green

### Quality

- [ ] `tsc -b`, `eslint`, `vite build` clean
- [ ] Consumer audit documented in the bolt's implementation notes
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                          | Type   | Stories       | Objective                                                                                 |
| ----------------------------- | ------ | ------------- | ----------------------------------------------------------------------------------------- |
| 046-planning-week-rollover-ui | Simple | 001, 002, 003 | Date helpers + week-aware current plan + week-aligned creation (the data/logic layer)     |
| 047-planning-week-rollover-ui | Simple | 004, 005, 006 | Catalog window label + rollover-on-open + `useWeekByOffset` anchor + full regression pass |

Sequence: `045 → 046 → 047`. `046` needs `045` (a readable `week_start_day`); `047` needs
`046` (the week-aware resolution it renders around).

---

## Notes

The riskiest change is FR-4's "current plan" redefinition — it is a shared hook. The consumer
audit is a hard acceptance gate, not a nicety: `ShoppingListPage` and `CookingViewPage` must
keep operating on the right plan, and any place that genuinely wants "latest plan regardless
of week" needs its own call.
