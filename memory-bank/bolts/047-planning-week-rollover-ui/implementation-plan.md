---
stage: plan
bolt: 047-planning-week-rollover-ui
created: '2026-09-04T02:30:00Z'
---

## Implementation Plan: 002-planning-week-rollover-ui (bolt 047)

### Objective

Make the planning window visible on the catalog and make a new week start clean on the next
app open. Stories: **004-catalog-planning-window-label**, **005-rollover-on-app-open**,
**006-rollover-regression-tests**.

### Deliverables

1. **`src/features/dinners/components/CatalogPage.tsx`** — header eyebrow shows the planning
   window:
   - `const weekStart = useWeekStartDay();`
   - `const weekLabel = weekStart.data != null ?
formatWeekRange(currentPlanningWeekStart(weekStart.data)) : 'This week';` (neutral
     placeholder while the setting loads — no wrong-range flash).
   - `<Text textStyle="eyebrow">{weekLabel}</Text>` in place of the literal "This week".
   - Matches `/plan`'s offset-0 label (both resolve to `currentPlanningWeekStart` /
     `plan.start_date`, which are equal now that plans are week-aligned — bolt 046).

2. **`src/features/weekly-plan/hooks.ts`** — `useWeekByOffset`:
   - `const weekStart = useWeekStartDay();`
   - anchor fallback `currentPlan.data?.start_date ?? currentPlanningWeekStart(weekStart.data
?? 0)` (was `?? todayIsoDate()`), so offset 0 is the current planning week even with no
     plan, and negative offsets step in true week increments from that anchor.
   - No timers / `visibilitychange` / midnight listeners — the planning-week start is derived
     from `todayIsoDate()` at render and simply not memoised across a reload (FR-7).

3. **Tests (story 006)**:
   - `CatalogPage.test.tsx` — new: the window-label eyebrow renders a `formatWeekRange`
     string; empty `0 of 3` when `fetchCurrentPlan` resolves `null`; an older **unlocked**
     plan (resolved by a different `start_date`) does not populate the grid; a first pick
     calls `createPlan` with `currentPlanningWeekStart(0)` (week-aligned).
   - `PlanPage.test.tsx` — new: with **no** current plan, offset 0's label is
     `formatWeekRange(currentPlanningWeekStart(0))` and stepping to offset −1 requests
     `fetchPlanByStartDate(shiftWeek(anchor, -1))`.
   - Rollover-boundary test (`date.ts#todayIsoDate` is the seam): a `vi.spyOn` on `todayIsoDate`
     returning a date in the _next_ week → `currentPlanningWeekStart` advances, catalog label
     updates, `useCurrentPlan` re-keys. Kept lightweight (helper-level, since `todayIsoDate`
     is imported live).
   - Regression sweep confirmed by running the full suite: `/plan` nav, `012` locking +
     `meal_history` path, shopping-list generation, cooking view.

### Acceptance Criteria

- [ ] Catalog header shows `formatWeekRange(currentPlanningWeekStart(week_start_day))`;
      neutral placeholder while loading; identical to `/plan` offset-0 label
- [ ] Header controls (count badge, suppressed link) do not reflow; `justify="space-between"`,
      `flexWrap="wrap"` intact
- [ ] `useWeekByOffset` anchor fallback is `currentPlanningWeekStart(...)`; offset 0 == current
      planning week with no plan; offset −1 steps one true week back
- [ ] No timer / listener added
- [ ] New catalog + plan tests pass; full suite green; `tsc -b`, `eslint`, `vite build` clean
- [ ] `todayIsoDate()` appears only as the `useWeekByOffset` anchor input and inside
      `currentPlanningWeekStart` — never as a plan `start_date`
