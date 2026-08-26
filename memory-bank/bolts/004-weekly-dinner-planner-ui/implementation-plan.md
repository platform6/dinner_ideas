---
stage: plan
bolt: 004-weekly-dinner-planner-ui
created: 2026-08-26T21:40:00Z
---

## Implementation Plan: weekly-dinner-planner-ui (bolt 2 of 4)

### Objective

Let the wife select up to 3 dinners for the week directly from the catalog, with each pick/unpick persisted immediately against a live weekly plan, plus a dedicated "This Week" page to review the current picks and see a locked plan as read-only once it's been sent.

### Deliverables

**New feature: `src/features/weekly-plan/`**
- `types.ts` — `WeeklyPlan`, `WeeklyPlanSelection`, and a `CurrentPlan` shape (plan + its selections, each selection carrying its `dinner_id` and embedded dinner summary for display)
- `api.ts`:
  - `fetchCurrentPlan()` — most recent `weekly_plans` row (`order=created_at.desc&limit=1`), embedding `weekly_plan_selections(*, dinners(*))`; returns `null` if none exists yet
  - `createPlan(startDate: string)` — inserts a new draft `weekly_plans` row
  - `addSelection(planId, dinnerId)` — inserts a `weekly_plan_selections` row
  - `removeSelection(selectionId)` — deletes a `weekly_plan_selections` row
- `hooks.ts`:
  - `useCurrentPlan()` — `react-query` wrapper around `fetchCurrentPlan`
  - `useToggleSelection()` — one mutation handling both add and remove (see Technical Approach), invalidates the current-plan query on success
- `components/PlanPage.tsx` — the "This Week" page: editable list of current selections + "X/3 selected" when unlocked, read-only summary + explanatory note when locked, empty state when no plan exists yet

**Catalog page changes** (`src/features/dinners/components/`)
- `DinnerCard.tsx`: add a selection toggle (checkbox-style) alongside the existing "Not interested" action; shows selected state; disabled (with a tooltip/message) when 3 are already selected and this dinner isn't one of them
- `CatalogPage.tsx`: show a running "X/3 selected" count (reads `useCurrentPlan()`), wire each card's toggle to `useToggleSelection()`

**Routing & nav**
- `App.tsx`: add `/plan` → `PlanPage`
- `Layout.tsx`: add a "This Week" nav link

### Dependencies

- `002-weekly-planning` (complete): `weekly_plans`/`weekly_plan_selections` schema + DB-enforced max-3/lock invariants (`ddd-02-technical-design.md`, `adr-001-db-enforced-domain-invariants.md`)
- `003-weekly-dinner-planner-ui` (complete): catalog page and `DinnerCard` this bolt extends
- No new npm packages

### Technical Approach

- **"Current plan" = the most recently created `weekly_plans` row.** If it's unlocked, it's the live draft everything acts on. If it's locked (or none exists), there is no current draft — selecting *any* dinner from the catalog transparently creates a fresh `weekly_plans` row first, which becomes the new current plan. This is what "starting next week's plan" means in practice: there's no separate "start new week" button, consistent with the no-separate-confirm-step philosophy already established in bolt 003's plan.
- **`start_date` on a new plan**: set to today's date at creation time (kept simple per `requirements.md`'s assumption — no calendar-week enforcement needed for MVP).
- **`useToggleSelection(dinnerId)` behavior**:
  1. If `dinnerId` is already selected in the current plan → remove that selection.
  2. Else if the current plan is missing or locked → create a new plan, then add the selection.
  3. Else if fewer than 3 are selected → add the selection.
  4. Else (already 3 selected, this dinner isn't one of them) → no-op client-side; UI already disables this case per the acceptance criteria ("blocked and prompted to deselect one first").
- **Client-side max-3 is UX only** — the DB trigger from `002-enforce-exactly-three-immutable` remains the real enforcement (per story `003-pick-three-dinners`' technical notes); any DB rejection (e.g. a race with another tab) is caught and shown as a plain-language error per `coding-standards.md`.
- **Swap = remove + add**, not a special API call, per the story's technical notes.
- **Locked-plan read-only view**: `PlanPage` renders the 3 selections without action buttons and a short note that new picks start next week's plan — satisfying `004-editable-until-locked`'s "make clear the only path forward" acceptance criterion without a separate confirmation UI.

### Acceptance Criteria

- [ ] Selecting a dinner from the catalog persists immediately, marks it visibly selected, and updates a running "X/3 selected" count
- [ ] Attempting to select a 4th dinner is blocked with a clear prompt to deselect one first
- [ ] Deselecting a dinner (when unlocked) removes it immediately
- [ ] Reaching exactly 3 selections doesn't require any extra "confirm" step
- [ ] Swapping a pick (remove one, add another) works and is reflected on the "This Week" page
- [ ] The "This Week" page shows the live editable plan when unlocked, and a clear read-only view when locked
- [ ] A page refresh mid-selection loses nothing — state is derived entirely from the DB, not local-only state
