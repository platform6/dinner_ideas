---
intent: 011-planning-week-rollover
phase: inception
status: complete
created: '2026-09-03T22:27:55Z'
updated: '2026-09-03T23:05:00Z'
---

# Requirements: Planning-Week Rollover & Visible Planning Window

## Intent Overview

Give the dinner planner an explicit, always-visible notion of **which week you are planning
for**, and make the picker **roll over to a fresh, unselected dinner set** when the planning
week advances — so "I plan dinners each week" is what the app actually does, instead of the
catalog showing the household's most recent picks indefinitely.

Today (`fetchCurrentPlan` in `src/features/weekly-plan/api.ts:5`) the catalog loads the newest
`weekly_plans` row by `created_at` with **no check that it belongs to the current week**. New
plans are created with `start_date = todayIsoDate()` (whatever day a card was first tapped),
not a week-aligned start. `/plan` already has a week strip (`useWeekByOffset`); the **catalog
is the only surface with no week awareness**.

**Type**: brown-field (enhancement — `src/features/weekly-plan/`, `src/features/dinners/`
(catalog), and a new household setting on `/settings`).

**Origin**: product-owner UX observation (2026-09-03) — "when I log in there are always 3
dinners selected; I expect to plan dinners each week, and it's not clear which week I'm
planning for."

**Sequencing**: `012-explicit-plan-locking` ships **before** this intent (locking must be a
clear, standalone action before rollover makes it the sole feeder of `meal_history`). `009`
(`clear-picks-reset`) ships **after** — as the narrower mid-week reset, and may fold in here.

## Boundary semantics (resolved)

- The household setting stores a **week-start weekday** (0 = Sunday … 6 = Saturday).
- **The configured weekday is the first day of the planning week.** A planning week is the
  half-open local-date interval `[most recent week-start weekday, +7 days)`.
- "Next week" is recognised at **00:00 local on the week-start weekday** (whole-date math on
  the device's local calendar date — e.g. with the Sunday default, the instant the local date
  becomes Sunday). The app **recomputes this on app open only** — no live in-session flip.
- Default before a household configures anything: **Sunday**. Local device time; no stored
  timezone.

## Business Goals

| Goal                                 | Success Metric                                                                                                                 | Priority |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| The planning week is never ambiguous | A `formatWeekRange()` window label ("M/D – M/D") is visible at the top of the catalog, matching `/plan`                        | Must     |
| A new week starts clean              | When the planning week advances past a plan, the catalog shows `0 of 3` selected — no manual clear, no lock required           | Must     |
| The household controls its turnover  | An owner sets the week-start weekday on `/settings`; "current planning week" derives from today + that setting in local time   | Must     |
| Nothing already built regresses      | `/plan` week nav, locking (`012`), meal history, shopping-list generation keep working; past plans stay reachable via week nav | Must     |

---

## Functional Requirements

### FR-1: `week_start_day` on `households`

- **Description**: Add a household-level setting for the planning-week start weekday.
- **Acceptance Criteria**:
  - New column `households.week_start_day smallint not null default 0` with
    `check (week_start_day between 0 and 6)` (0 = Sunday).
  - Append-only migration under `supabase/migrations/`; no edits to prior files.
  - No new RLS policy needed — the existing `"Household updatable by an owner"` policy on
    `households` already scopes `UPDATE` to an owner of the row; `SELECT` is covered by
    `"Household readable by its members"`.
  - `database.types.ts` regenerated so the column is typed.
  - Backfill is implicit (`default 0`) — every existing household reads as Sunday until changed.
- **Priority**: Must

### FR-2: Owner control on `/settings`

- **Description**: A card on the existing `/settings` page lets an **owner** choose the
  week-start weekday.
- **Acceptance Criteria**:
  - A new card (sibling to `ClaudeAiCard`) titled e.g. "Planning week", with a 7-option
    control (Sunday…Saturday) bound to `households.week_start_day`.
  - Visible to all household members; the control is **disabled** (read-only) for non-owners,
    matching how owner-only AI controls behave.
  - Save path: a direct PostgREST `update` on `households` (no RPC needed — unlike the AI
    config, there is no protected column here). Reads via a `useHouseholdSettings`-style hook;
    write invalidates it and anything keyed on the planning week.
  - Helper text states the effect: _"Your dinner plan starts fresh each {weekday}."_
  - On failure: an inline error; the previous value stays selected.
- **Priority**: Must

### FR-3: Planning-week date helper

- **Description**: A pure function that returns the `start_date` of the planning week
  containing a given local date, for a given week-start weekday.
- **Acceptance Criteria**:
  - Added to `src/features/weekly-plan/date.ts`, e.g.
    `planningWeekStart(isoDate: string, weekStartDay: number): string`.
  - Returns the most recent date ≤ `isoDate` whose weekday === `weekStartDay` (same date if
    `isoDate` already falls on that weekday).
  - Whole-date, local-time math (reuses `parseLocalDate` / `toIsoDate`); DST-safe (no
    hour arithmetic).
  - A companion `currentPlanningWeekStart(weekStartDay)` = `planningWeekStart(todayIsoDate(),
weekStartDay)`.
  - Unit tests cover: `isoDate` on the boundary; day before / day after; every `weekStartDay`
    0–6; a month/year wrap; a date inside a DST transition week.
- **Priority**: Must

### FR-4: Week-aware "current plan"

- **Description**: The app's notion of the current plan becomes **"the plan whose `start_date`
  is the current planning week's start"**, not "the newest plan by `created_at`".
- **Acceptance Criteria**:
  - `useCurrentPlan()` (or a new `useCurrentPlanningWeekPlan()` it delegates to) resolves the
    plan via `fetchPlanByStartDate(currentPlanningWeekStart(weekStartDay))`.
  - When no plan exists for the current planning week, it resolves to `null` (not an older
    plan) — the catalog then renders the empty `0 of 3` state.
  - An **older unlocked plan is not surfaced** on the catalog (resolved decision #4 — it stays
    silent, reachable only via `/plan` week nav).
  - Consumer audit: `useCurrentPlan` is read by the catalog, `/plan` (offset 0),
    `ShoppingListPage`, `CookingViewPage`. Each must still behave correctly with the new
    semantics — in particular the shopping list / cooking view for the current week operate on
    the current planning week's plan. Any consumer that genuinely wants "most recent plan
    regardless of week" (if any) keeps a separate call. This audit is an acceptance gate.
  - The query key incorporates the planning-week start so a rollover-on-open produces a fresh
    fetch.
- **Priority**: Must

### FR-5: Week-aligned `start_date` on plan creation

- **Description**: A newly created plan is stamped with the current planning week's start
  date, not `todayIsoDate()`.
- **Acceptance Criteria**:
  - In `useToggleSelection` (`hooks.ts:72`), the `create-and-add` branch calls
    `createPlan(currentPlanningWeekStart(weekStartDay))`.
  - `todayIsoDate()` is no longer used as a plan `start_date` anywhere (it remains valid as the
    week-nav anchor fallback — see FR-7).
  - `toggle-selection.ts` / `decideToggleAction` need the week-start value threaded through, or
    the planning-week start computed at the call site and passed in — no change to the pure
    function's contract beyond the argument.
  - Creating the first pick of a new planning week produces a plan whose `start_date` equals
    what `fetchPlanByStartDate` will look up on the next load (FR-4) — i.e. the pick persists
    and reappears.
- **Priority**: Must

### FR-6: Planning-window label on the catalog

- **Description**: Show which week is being planned, at the top of the catalog.
- **Acceptance Criteria**:
  - A small element in the `CatalogPage` header area renders
    `formatWeekRange(currentPlanningWeekStart(weekStartDay))` (existing helper, unchanged —
    "M/D – M/D").
  - Reads identically to the `/plan` week-nav label for offset 0.
  - Present whether or not a plan exists for the week (it describes the window, not the plan).
  - Does not shift the existing header controls out of place (count badge, "Clear picks" slot
    from `009` later, "Not interested" icon button, `justify="space-between"`, `flexWrap`).
- **Priority**: Must

### FR-7: Rollover on app open

- **Description**: The current planning week is recomputed every time the app loads; crossing
  the boundary between sessions yields a fresh, empty catalog for the new week.
- **Acceptance Criteria**:
  - "Current planning week start" is derived at app/route mount from `todayIsoDate()` +
    `week_start_day`; it is **not** memoised across a reload.
  - No timer, no `visibilitychange` handler, no midnight listener — a session left open across
    the boundary keeps showing the old week until reload (explicitly out of scope).
  - `useWeekByOffset`'s anchor fallback changes from `todayIsoDate()` to
    `currentPlanningWeekStart(weekStartDay)` so offset 0 == the current planning week even when
    no plan exists yet, and past offsets step in true week increments.
  - After the boundary, on first load: catalog shows the new window label (FR-6) and `0 of 3`;
    `/plan` offset 0 shows the new week; the previous week is reachable at offset −1.
- **Priority**: Must

### FR-8: Behaviour without configuration / for non-owners

- **Description**: The feature is fully functional before anyone visits `/settings`.
- **Acceptance Criteria**:
  - With `week_start_day` at its `0` default, everything works with Sunday weeks.
  - A non-owner sees the correct window and rollover; they just can't change the setting
    (FR-2).
  - Changing the setting takes effect on the next recompute (next app open / next query
    invalidation) — a mid-week change re-derives the current window from the new weekday. The
    settings card notes this: _"Changing this affects the current week immediately."_
- **Priority**: Should

### FR-9: Tests & regression

- **Description**: Cover the new behaviour and prove existing flows are intact.
- **Acceptance Criteria**:
  - `date.test.ts`: the FR-3 helper cases.
  - Catalog tests: window label renders; empty `0 of 3` when no plan for the week; an older
    unlocked plan does **not** populate the grid; first pick creates a week-aligned plan that
    survives a reload.
  - `/settings` tests: owner can change the weekday and it persists; non-owner control is
    disabled.
  - Regression: `/plan` week nav (offsets, `formatWeekRange`), `012` locking, shopping-list
    generation, cooking view, and `meal_history`-on-lock all still pass.
  - Existing `weekly-plan` / `dinners` / `shopping-list` / `cooking-view` suites stay green.
- **Priority**: Must

---

## Non-Functional Requirements

### Correctness

| Requirement          | Target                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local-time week math | Whole-date arithmetic on the local calendar date; no UTC conversion, no hour math; DST transition weeks produce a correct 7-calendar-day window. |
| Determinism          | `planningWeekStart` is pure; same `(isoDate, weekStartDay)` → same result.                                                                       |
| Boundary             | A plan/pick at local `23:59` on the last day belongs to the ending week; at `00:00` on the week-start weekday it belongs to the new week.        |

### Architecture / Compatibility

| Requirement    | Notes                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| No new backend | One column + a client-side PostgREST update under an existing RLS policy.                                             |
| Schema         | Single additive column on `households`; append-only migration; `database.types.ts` regenerated.                       |
| Reuse          | `formatWeekRange`, `fetchPlanByStartDate`, `parseLocalDate`, `toIsoDate`, `useWeekByOffset` are reused, not replaced. |

### Security / Tenancy

| Requirement   | Notes                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Setting write | Owner-only, via the existing `"Household updatable by an owner"` policy — no new policy, no service role. |
| Setting read  | Members only, via `"Household readable by its members"`.                                                  |

### Regression

| Requirement                  | Target                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `/plan`                      | Week strip, offsets, labels unchanged in behaviour.                                |
| Locking (`012`)              | The current planning week's plan is what locks; `meal_history` writes as before.   |
| Shopping list / cooking view | Operate on the current planning week's plan; no change for a week that has a plan. |

---

## Constraints

- **No change to the locking mechanism** — that is `012` (sequenced before this).
- **No live midnight flip** — recompute is on app open only.
- **No stored timezone** — local device time; single-family scope as `001`–`010`.
- **Reuse `formatWeekRange()` verbatim** — the `MM/dd` format idea was dropped.
- Older unlocked plans stay **silent** — no "unfinished plan" prompt in this intent.

## Assumptions

| Assumption                                                                                 | Risk if Invalid                     | Mitigation                                                                |
| ------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------- |
| `households` has an owner-only `UPDATE` RLS policy                                         | FR-2 needs a new policy             | **Verified** — `"Household updatable by an owner"` (`20260828230000:129`) |
| `fetchPlanByStartDate` returns the plan for an exact `start_date` with selections embedded | FR-4 needs a new query              | **Verified** — `weekly-plan/api.ts:22`                                    |
| `useToggleSelection` is the only creator of `weekly_plans` rows                            | FR-5 misses a creation path         | **Verified** — `createPlan` has one caller (grep)                         |
| `formatWeekRange(start)` renders a 7-day "M/D – M/D" window from a start date              | FR-6 label is wrong at boundaries   | **Verified** — `date.ts:36`                                               |
| Catalog `selectedDinnerIds` already empties for a missing plan                             | Empty-week state needs a new guard  | **Verified** — `CatalogPage.tsx:41-44` returns `new Set()` when `!plan`   |
| No DB trigger backfills or auto-creates `weekly_plans` / selections                        | Rollover could resurrect stale rows | **Verified** — no such trigger in any migration                           |

## Open Questions — RESOLVED 2026-09-03

| #    | Resolution                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | The configured weekday is the **first** day of the planning week; "next week" begins at 00:00 local on that weekday.        |
| OQ-2 | Default week-start weekday: **Sunday** (`0`).                                                                               |
| OQ-3 | Setting stored as **`week_start_day` column on `households`**.                                                              |
| OQ-4 | **Owner-only** edit, via the existing `households` UPDATE policy.                                                           |
| OQ-5 | Meal-history exposure handled by splitting explicit locking into **`012`**, sequenced first. `011` makes no locking change. |
| OQ-6 | **Reuse `formatWeekRange()` as-is**; drop the `MM/dd` format change.                                                        |

## Priority Definitions

| Priority | Meaning                                                              |
| -------- | -------------------------------------------------------------------- |
| Must     | Rollover / window is incomplete or incorrect without it              |
| Should   | Real value (no-config polish, mid-week change note) but not blocking |
| Could    | —                                                                    |
| Won't    | See Out of Scope                                                     |

## Out of Scope (Won't — this intent)

- A live in-session flip at the midnight boundary (recompute is on app open only).
- Any "you have an unfinished plan from last week" prompt/nudge.
- Auto-locking an outgoing plan.
- Any change to the locking mechanism (→ `012`) or a manual mid-week reset (→ `009`).
- Multi-timezone / stored-timezone handling.
- Changing `formatWeekRange()` output.
