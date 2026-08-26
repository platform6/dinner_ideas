---
stage: implement
bolt: 004-weekly-dinner-planner-ui
created: 2026-08-26T21:45:00Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (bolt 2 of 4)

### Summary

Added the pick-3 selection flow: a "Pick for this week" toggle on each catalog card, a running "X/3 selected" count, and a new "This Week" page showing the live editable plan or a read-only summary once it's locked.

### Structure Overview

New `src/features/weekly-plan/` feature (types/api/hooks/`PlanPage`) alongside the existing `dinners` and `auth` features. `DinnerCard` gained an optional `selection` prop so the Suppressed view (which doesn't pass it) is unaffected. Routing/nav extended with `/plan`.

### Completed Work

- [x] `src/features/weekly-plan/types.ts` — `WeeklyPlan`, `WeeklyPlanSelection`, `CurrentPlan` (plan + embedded selections + embedded dinner per selection)
- [x] `src/features/weekly-plan/api.ts` — `fetchCurrentPlan` (most recent plan + selections), `createPlan`, `addSelection`, `removeSelection`
- [x] `src/features/weekly-plan/hooks.ts` — `useCurrentPlan`; `useToggleSelection` (add/remove/create-plan-if-needed, single mutation)
- [x] `src/features/weekly-plan/components/PlanPage.tsx` — "This Week" page: empty state, editable list with per-item Remove, locked read-only summary, mutation-error alert
- [x] `src/features/dinners/components/DinnerCard.tsx` — added an optional `selection` prop (checkbox, disabled + tooltip when 3 already picked, hidden entirely for the Suppressed view)
- [x] `src/features/dinners/components/CatalogPage.tsx` — wires each card's selection state to `useCurrentPlan`/`useToggleSelection`; shows "X/3 selected" and a mutation-error alert
- [x] `src/App.tsx` — added `/plan` route
- [x] `src/shared/components/Layout.tsx` — added "This Week" nav link
- [x] `src/features/dinners/components/CatalogPage.test.tsx` — updated to mock `weekly-plan/api` (was making a real, unmocked network call once `CatalogPage` started reading the current plan)

### Key Decisions

- **One mutation (`useToggleSelection`) for add/remove/create**: matches the story's "swap = remove + add, not a special API" framing, and keeps the "start next week by just picking a dinner" behavior (no separate button) as a single code path rather than three call sites making the decision independently.
- **`DinnerCard`'s `selection` prop is optional**: keeps the Suppressed view's cards simple (no picking from there) without a variant-specific fork inside the component.

### Deviations from Plan

None — implemented as scoped in `implementation-plan.md`.

### Dependencies Added

None — no new npm packages.

### Developer Notes

- Client-side max-3 (disabling the checkbox) is UX only; the DB trigger from `002-weekly-planning` remains the real enforcement. A rejected mutation (e.g. a race with another tab, or the plan having just been locked) surfaces as a plain "Couldn't save that change, try again" alert on both the Catalog and Plan pages.
- `pnpm run lint`, `pnpm exec tsc -b`, `pnpm run build`, and the existing test suite (14/14) all still pass clean.
