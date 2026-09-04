---
intent: 011-planning-week-rollover
phase: inception
status: draft
updated: '2026-09-03T22:55:00Z'
---

# Planning-Week Rollover — Unit Decomposition

## Units Overview

**Two units, split by layer.** The setting (a household-scoped weekday the whole feature reads
from) is separable infrastructure that the behavioural rewrite depends on: landing it first
lets the one-column migration + `/settings` card be reviewed and shipped before the
cross-cutting "current plan" semantic change. Mirrors how `004-account-model` split its data
model from its UI.

Both units are frontend / `simple-construction-bolt` — the backend change is a single additive
column with no new policy, constraint, or RPC, so DDD ceremony is not warranted.

### Unit 1: 001-week-start-setting

**Description**: The week-start-weekday setting exists and can be read + (owner-)written. The
additive `households.week_start_day` column + migration + `database.types.ts` regen, a
`useHouseholdSettings`-style read/update hook, and a "Planning week" card on `/settings`
(7-option weekday picker, disabled for non-owners).

**Unit Type**: frontend (+ one-line additive migration)
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `supabase/migrations/<ts>_households_week_start_day.sql` — `alter table public.households add
column week_start_day smallint not null default 0 check (week_start_day between 0 and 6);`
  plus a `comment on column`. No policy changes.
- `src/shared/types/database.types.ts` — regenerated
- `src/features/settings/api.ts` — `+ fetchHouseholdSettings()` / `+ updateWeekStartDay(day)`
  (direct PostgREST `select` / `update` on `households`; update relies on the existing owner
  RLS policy)
- `src/features/settings/hooks.ts` (or co-located) — `useHouseholdSettings()` read +
  `useUpdateWeekStartDay()` mutation, invalidates the settings query **and** the
  planning-week-keyed plan queries
- `src/features/settings/PlanningWeekCard.tsx` — **new**; weekday `Select`/segmented control
  bound to `week_start_day`; disabled + explanatory for non-owners; helper text _"Your dinner
  plan starts fresh each {weekday}."_ + _"Changing this affects the current week
  immediately."_; inline error on failure, previous value retained
- `src/features/settings/SettingsPage.tsx` — mount `PlanningWeekCard` as a sibling of
  `ClaudeAiCard`
- `src/features/settings/*.test.tsx` — new/extended (owner can change + persists; non-owner
  disabled; failure keeps prior value)

**FRs**: FR-1, FR-2, FR-8

**Dependencies**: `004-account-model` (complete) — `households` table + `"Household updatable
by an owner"` / `"Household readable by its members"` policies, the `useAuth`
`role`/`householdId` context; `007-claude-integration` (complete) — `/settings` route + card
layout. Blocks Unit 2.

**Estimated Complexity**: **S** — one additive column, one card modeled on the existing AI
card, one read + one owner-guarded update.

---

### Unit 2: 002-planning-week-rollover-ui

**Description**: The behavioural change. Pure date helpers for the planning week, a week-aware
"current plan", week-aligned plan creation, the catalog planning-window label, rollover
recompute on app open, the `useWeekByOffset` anchor change, the cross-consumer audit, and the
regression suite.

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/weekly-plan/date.ts` — `+ planningWeekStart(isoDate, weekStartDay)` and
  `+ currentPlanningWeekStart(weekStartDay)`; whole-date local math reusing `parseLocalDate` /
  `toIsoDate`
- `src/features/weekly-plan/date.test.ts` — boundary, ±1 day, all 7 weekdays, month/year wrap,
  a DST-transition week
- `src/features/weekly-plan/hooks.ts` — `useCurrentPlan()` resolves the plan for
  `currentPlanningWeekStart(weekStartDay)` via `fetchPlanByStartDate` (not "newest by
  `created_at`"); query key includes the planning-week start; `useToggleSelection`
  `create-and-add` calls `createPlan(currentPlanningWeekStart(...))`; `useWeekByOffset` anchor
  fallback `todayIsoDate()` → `currentPlanningWeekStart(...)`
- `src/features/weekly-plan/toggle-selection.ts` — thread the planning-week start through
  `decideToggleAction` (argument only; contract otherwise unchanged)
- `src/features/dinners/components/CatalogPage.tsx` — render
  `formatWeekRange(currentPlanningWeekStart(...))` in the header; the empty `0 of 3` state is
  already handled when `plan` is `null`
- **Consumer audit** — `useCurrentPlan` readers (`CatalogPage`, `PlanPage` offset 0,
  `ShoppingListPage`, `CookingViewPage`): confirm each is correct under "current = this
  planning week's plan"; anything needing "latest regardless of week" gets a separate call
- `src/features/**/*.test.*` — catalog window label; empty state on rollover; older unlocked
  plan does not populate the grid; first pick creates a week-aligned plan that survives
  reload; `/plan` nav regression; `012` locking regression; `meal_history`-on-lock intact

**FRs**: FR-3, FR-4, FR-5, FR-6, FR-7, FR-9

**Dependencies**: Unit 1 (`week_start_day` must be readable). `001-weekly-dinner-planner`
(complete) — `weekly_plans`, `fetchPlanByStartDate`, `useWeekByOffset`, `formatWeekRange`,
`CatalogPage`. Depended by: `009-clear-picks-reset` (sequenced after).

**Estimated Complexity**: **M** — the date math is small and well-specified, but the
"current plan" semantic change touches four consumers and carries the regression weight.

## Unit Dependency Graph

```text
[004-account-model (complete)] ─┐
[007-claude-integration (cplt)] ─┼──> [001-week-start-setting] ──> [002-planning-week-rollover-ui] ──> (enables 009)
[001-weekly-dinner-planner (c)] ─┘                                        ▲
                                     [012-explicit-plan-locking] ────────┘  (ships before this intent)
```

## Execution Order

1. `001-week-start-setting` — column + migration + `/settings` card. Blocks Unit 2.
2. `002-planning-week-rollover-ui` — date helpers + week-aware current plan + window label +
   rollover + regression. Natural bolt split: helpers/data layer first, then the catalog
   surface + rollover + tests.

## Requirement-to-Unit Mapping

- **FR-1** (`week_start_day` on `households`) → `001-week-start-setting`
- **FR-2** (owner control on `/settings`) → `001-week-start-setting`
- **FR-3** (planning-week date helper) → `002-planning-week-rollover-ui`
- **FR-4** (week-aware "current plan") → `002-planning-week-rollover-ui`
- **FR-5** (week-aligned `start_date` on creation) → `002-planning-week-rollover-ui`
- **FR-6** (planning-window label on the catalog) → `002-planning-week-rollover-ui`
- **FR-7** (rollover on app open) → `002-planning-week-rollover-ui`
- **FR-8** (behaviour without config / for non-owners) → `001-week-start-setting`
- **FR-9** (tests & regression) → `002-planning-week-rollover-ui` (Unit 1's own tests ship
  with its stories)
