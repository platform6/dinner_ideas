---
intent: 009-clear-picks-reset
phase: inception
status: draft
updated: '2026-09-01T02:00:00Z'
---

# Clear Picks — Unit Decomposition

## Units Overview

One unit. Every FR is one cohesive slice against the existing frontend + its Supabase data
layer: a new presentational component, one `api.ts` function, two `hooks.ts` mutations, and
the `CatalogPage` wiring (mount + `clearedIds` state + undo bar). There is no backend surface
— `clearSelections` is a single `delete` over an existing RLS-scoped table. Same
single-UI-unit shape as `003-frontend-review-remediation`'s `001-frontend-review-ui`.

### Unit 1: 001-clear-picks-ui

**Description**: Owns the whole feature — the `ClearPicksControl` component and its three
inline states (FR-1), its placement between the count badge and the "Not interested" icon
button (FR-2), the inline confirm interaction with the single call-site terracotta fill
(FR-3), the `clearSelections` API function (FR-4), the `useClearSelections` /
`useRestoreSelections` hooks (FR-5, FR-6), the parent-owned undo bar (FR-7), in-flight +
error handling (FR-8), keyboard / a11y (FR-9), and the new + extended tests (FR-10).

**Unit Type**: frontend (+ thin Supabase data layer, no schema)
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/features/weekly-plan/components/ClearPicksControl.tsx` — **new**; adapted + verified
  from `ClearPicksControl.reference.tsx`
- `src/features/weekly-plan/components/ClearPicksControl.test.tsx` — **new**
- `src/features/weekly-plan/api.ts` — `+ clearSelections(planId)`
- `src/features/weekly-plan/hooks.ts` — `+ useClearSelections()`, `+ useRestoreSelections()`
  (adapted from `clear-selections.reference.ts`)
- `src/features/dinners/components/CatalogPage.tsx` — mount the control in the right-hand
  header `HStack`; own `clearedIds: string[] | null`; render the undo bar in the
  `toggleSelection.isError` slot; extend `selectionDisabled` with an "is clearing" term;
  focus management (confirm → "Keep", cleared → "Undo")
- `src/features/dinners/components/CatalogPage.test.tsx` — extend
- `src/features/weekly-plan/hooks.test.ts` / `api.test.ts` — add coverage for the two hooks +
  `clearSelections` if those test files exist (else co-locate minimal new ones)

**Dependencies**:

- Depends on: `001-weekly-dinner-planner` (complete) — `weekly_plans`,
  `weekly_plan_selections`, `addSelection`, `useToggleSelection`, `useCurrentPlan`,
  `CatalogPage` header; `004-account-model` (complete) — the household-scoped RLS on
  `weekly_plan_selections`
- Depended by: none

**Estimated Complexity**: **S** — one component with three trivial states, one `delete`, two
small mutations, and localised `CatalogPage` wiring. The reference files do most of the design
work; the effort is adapting them to real names/paths, the focus-management details (FR-9),
and the tests. No schema, no new dependency.

## Unit Dependency Graph

```text
[001-weekly-dinner-planner (complete)] ──> [001-clear-picks-ui]
[004-account-model (complete)] ─────────┘
```

## Execution Order

1. `001-clear-picks-ui` (only unit). A bolt sequence would naturally do the data layer
   (`clearSelections` + the two hooks) first, then the component, then the `CatalogPage`
   wiring + tests.

## Requirement-to-Unit Mapping

- **FR-1** (`ClearPicksControl` component) → `001-clear-picks-ui`
- **FR-2** (header placement) → `001-clear-picks-ui`
- **FR-3** (inline confirm) → `001-clear-picks-ui`
- **FR-4** (`clearSelections`) → `001-clear-picks-ui`
- **FR-5** (`useClearSelections`) → `001-clear-picks-ui`
- **FR-6** (`useRestoreSelections`) → `001-clear-picks-ui`
- **FR-7** (undo bar) → `001-clear-picks-ui`
- **FR-8** (in-flight + errors) → `001-clear-picks-ui`
- **FR-9** (keyboard / a11y) → `001-clear-picks-ui`
- **FR-10** (tests) → `001-clear-picks-ui`
