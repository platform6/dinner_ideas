---
stage: plan
bolt: 046-planning-week-rollover-ui
created: '2026-09-04T02:15:00Z'
---

## Implementation Plan: 002-planning-week-rollover-ui (bolt 046)

### Objective

Redefine "current plan" as _this planning week's plan_ and file new plans under the right
week. Stories: **001-planning-week-date-helpers**, **002-week-aware-current-plan**,
**003-week-aligned-plan-creation**.

### Deliverables

1. **`src/features/weekly-plan/date.ts`** — `+ planningWeekStart(isoDate, weekStartDay)`:
   walk back `((getDay() - weekStartDay + 7) % 7)` calendar days from the local date; reuse
   the module's `parseLocalDate` / `toIsoDate`. `+ currentPlanningWeekStart(weekStartDay)` =
   `planningWeekStart(todayIsoDate(), weekStartDay)`.

2. **`src/features/weekly-plan/date.test.ts`** — add: input on the week-start weekday returns
   itself; day-before / day-after; all seven `weekStartDay` values; month-boundary wrap;
   year-boundary wrap; a week spanning a DST transition still resolves to a 7-calendar-day
   window start.

3. **`src/features/weekly-plan/api.ts`** — `fetchCurrentPlan` gains a `startDate: string`
   parameter and delegates to `fetchPlanByStartDate(startDate)` (so "current" now means "the
   plan for this planning week", not "newest by `created_at`"). Keeps the name so existing
   mock points don't move.

4. **`src/features/weekly-plan/hooks.ts`**
   - `useCurrentPlan()` — resolve `startDate = currentPlanningWeekStart(weekStartDay)` from
     `useWeekStartDay()`; `useQuery({ queryKey: [...currentPlanKey, startDate], queryFn: () =>
fetchCurrentPlan(startDate), enabled: startDate != null })`. `currentPlanKey`
     (`['weekly-plan','current']`) stays the invalidation **prefix** — existing
     `invalidateQueries({ queryKey: currentPlanKey })` in `useToggleSelection` / `useLockPlan`
     still match.
   - `useToggleSelection()` — the `create-and-add` branch calls
     `createPlan(currentPlanningWeekStart(weekStartDay ?? 0))` instead of
     `createPlan(todayIsoDate())`.
   - `useWeekByOffset` — **unchanged in this bolt**; its `todayIsoDate()` anchor fallback
     moves to `currentPlanningWeekStart` in bolt 047 (story 005).

5. **Consumer test updates** (the audit — `useCurrentPlan` now also needs a resolved
   `week_start_day`): add `vi.mock('@/features/settings/api')` + `beforeEach`
   `vi.mocked(fetchWeekStartDay).mockResolvedValue(0)` to `PlanPage.test.tsx`,
   `ShoppingListPage.test.tsx`, `CatalogPage.test.tsx`, `CookingViewPage.test.tsx`. The
   `fetchCurrentPlan` resolver mocks are unchanged (the added `startDate` arg is ignored by
   the mock).

### Consumer Audit (story 002 acceptance gate)

| Consumer              | Reads `useCurrentPlan` for        | Under new semantics                                                  | Change                      |
| --------------------- | --------------------------------- | -------------------------------------------------------------------- | --------------------------- |
| `CatalogPage`         | the current pick set + count      | this planning week's plan; `null` → empty `0 of 3` (already handled) | none (test: +settings mock) |
| `PlanPage` (offset 0) | current-week picks + lock         | same; `useWeekByOffset` offset-0 `active = currentPlan`              | none in 046 (anchor → 047)  |
| `ShoppingListPage`    | the plan to build the list from   | this planning week's plan                                            | none (test: +settings mock) |
| `CookingViewPage`     | the locked plan's dinners to cook | this planning week's plan (locked or not)                            | none (test: +settings mock) |
| `useToggleSelection`  | snapshot for add/remove decision  | same snapshot, now week-scoped                                       | `createPlan` date only      |

No consumer needs "newest plan regardless of week" — `fetchCurrentPlan`'s old semantics are
fully retired.

### Acceptance Criteria

- [ ] `planningWeekStart` correct for all 7 weekdays, boundary/adjacent dates, month + year
      wrap, a DST-transition week; pure/deterministic
- [ ] `useCurrentPlan` resolves the plan whose `start_date === currentPlanningWeekStart(...)`;
      `null` when none; query keyed with the planning-week start; disabled until
      `week_start_day` loads
- [ ] An older unlocked plan never reaches the catalog grid (it's just not fetched)
- [ ] First pick creates a plan stamped `currentPlanningWeekStart(...)`; `todayIsoDate()` is
      no longer a plan `start_date`
- [ ] `invalidateQueries(['weekly-plan','current'])` still refreshes the (now longer-keyed)
      current-plan query
- [ ] Full suite green; `tsc -b`, `eslint`, `vite build` clean
