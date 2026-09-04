---
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
phase: inception
status: complete
created: '2026-09-04T02:36:10Z'
updated: '2026-09-04T02:45:00Z'
unit_type: frontend
default_bolt_type: simple-construction-bolt
---

# Unit Brief: Clear Picks UI

## Purpose

Add one control — **Clear picks** — to the catalog header that wipes the current planning
week's dinner selection in a single guarded, undoable action: inline confirm → one keyed
`delete` → a parent-owned undo bar. Frontend + a thin Supabase data layer; no schema.

## Scope

### In Scope

- `ClearPicksControl` component: quiet "Clear picks" button ⇄ inline "Clear all {n}?" confirm
  ("Keep" / "Clear all"), call-site terracotta fill (FR-1, FR-3)
- Placement as the 2nd child of the catalog header's right-hand `HStack` — count badge,
  control, "Not interested" icon button (FR-2)
- `clearSelections(planId)` + `useClearSelections()` (returns removed ids in order) +
  `useRestoreSelections()` (sequential re-add) (FR-4, FR-5, FR-6)
- `CatalogPage`-owned `clearedIds` state + the undo bar in the `toggleSelection.isError`
  region, `aria-live="polite"`, dismiss on Undo / pick-another / navigate-away, no timer
  (FR-7)
- In-flight + errors: `selectionDisabled` gains a "clearing" term; clear/undo error alerts;
  control + undo bar hidden on a locked plan (FR-8)
- Keyboard / a11y: focus → "Keep" on open, `Escape` cancels, focus → "Undo" after a clear,
  `role="group"` on the pill (FR-9)
- New `ClearPicksControl.test.tsx`, `clear-selections.test.ts`; extended `CatalogPage.test.tsx`
  (FR-10)

### Out of Scope

- Any `/plan` change — `PlanPage.tsx` and its per-row `×` are untouched (OQ-2 = no)
- Persisting Undo across navigation or reload (OQ-1 = no — `clearedIds` is `CatalogPage`
  state only)
- Option 1b (chip strip / "Start over"); a `danger` Button theme variant; any schema,
  migration, RPC, token, or dependency

---

## Assigned Requirements

| FR    | Requirement                              | Priority |
| ----- | ---------------------------------------- | -------- |
| FR-1  | `ClearPicksControl` component (3 states) | Must     |
| FR-2  | Placement in the catalog header          | Must     |
| FR-3  | Inline confirm interaction               | Must     |
| FR-4  | `clearSelections(planId)`                | Must     |
| FR-5  | `useClearSelections()`                   | Must     |
| FR-6  | `useRestoreSelections()` (Undo)          | Must     |
| FR-7  | Undo bar (parent-owned in `CatalogPage`) | Must     |
| FR-8  | In-flight & error handling               | Must     |
| FR-9  | Keyboard & accessibility                 | Must     |
| FR-10 | Tests                                    | Must     |

---

## Domain Concepts

_None new._ Reuses `weekly_plans` / `weekly_plan_selections`, `addSelection`, `useCurrentPlan`.

### Key Operations

| Operation | Description                                                         | Inputs                  | Outputs                                    |
| --------- | ------------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| Clear     | one `DELETE weekly_plan_selections WHERE weekly_plan_id = $1`       | plan id                 | plan emptied; `currentPlanKey` invalidated |
| Undo      | sequential `addSelection(planId, id)` for each removed id, in order | `{ planId, dinnerIds }` | selections restored 1/2/3                  |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 6     |
| Must Have     | 6     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                         | Title                                        | Priority | Status                 |
| -------------------------------- | -------------------------------------------- | -------- | ---------------------- |
| 001-clear-picks-control          | `ClearPicksControl` component                | Must     | ✅ complete (bolt 048) |
| 002-clear-selections-hooks       | `clearSelections` + the two mutation hooks   | Must     | ✅ complete (bolt 048) |
| 003-catalog-mount-and-undo-bar   | Header placement + `clearedIds` + undo bar   | Must     | ✅ complete (bolt 049) |
| 004-in-flight-and-error-handling | `selectionDisabled` + errors + locked hidden | Must     | ✅ complete (bolt 049) |
| 005-keyboard-and-a11y            | Focus flow + `aria-live`                     | Must     | ✅ complete (bolt 049) |
| 006-clear-picks-tests            | Component + integration + data-layer tests   | Must     | ✅ complete (bolt 049) |

---

## Dependencies

### Depends On

| Unit                                    | Reason                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `001-weekly-dinner-planner` (complete)  | `weekly_plans`, `weekly_plan_selections`, `addSelection`, `useCurrentPlan`, `CatalogPage` header, `selectionDisabled` |
| `004-account-model` (complete)          | household RLS on `weekly_plan_selections`                                                                             |
| `011-planning-week-rollover` (complete) | `useCurrentPlan` is now week-aware — clear operates on the current planning week's plan                               |
| `012-explicit-plan-locking` (complete)  | `LockWeekControl` is the interaction template for `ClearPicksControl`                                                 |

### Depended By

_None._

### External Dependencies

| System                                              | Purpose                                                          | Risk |
| --------------------------------------------------- | ---------------------------------------------------------------- | ---- |
| Supabase `weekly_plan_selections`                   | one keyed `delete` + N sequential `insert` (undo); RLS unchanged | Low  |
| `lucide-react` (`uiIcons.restore` / `uiIcons.info`) | already exported                                                 | Low  |

---

## Constraints

- Option 1a only. Clear = one keyed `delete`, never N × `useToggleSelection`. Undo =
  sequential re-adds, not `Promise.all`. Terracotta "Clear all" fill is a call-site style, no
  theme variant. No schema / migration / dependency / token. `PlanPage.tsx` untouched.
- Undo does not survive navigation (OQ-1).

---

## Success Criteria

### Functional

- [ ] "Clear picks" appears at 1–3 picks, hidden at 0 and when locked; the confirm guards the
      wipe; a successful clear shows the undo bar
- [ ] Undo restores the exact 1/2/3 order; the bar also dismisses on pick-another /
      navigate-away
- [ ] Pick cards disabled while clearing; clear/undo failures show a short inline alert

### Non-Functional

- [ ] Keyboard-complete: open → "Keep", `Escape` cancels, cleared → "Undo"; `aria-live` bar
- [ ] Zero new tokens; no `danger` variant; existing `weekly-plan` / `dinners` suites green

### Quality

- [ ] `tsc -b`, `eslint`, `vite build` clean; code reviewed

---

## Bolt Suggestions

| Bolt               | Type   | Stories            | Objective                                         |
| ------------------ | ------ | ------------------ | ------------------------------------------------- |
| 048-clear-picks-ui | Simple | 001, 002           | The component + the data layer                    |
| 049-clear-picks-ui | Simple | 003, 004, 005, 006 | Catalog wiring + undo bar + errors + a11y + tests |

Sequence: `048 → 049`.

---

## Notes

`ClearPicksControl` and `LockWeekControl` (intent 012) are the two sibling header controls the
handoff designed to match — same three-state prop-driven shape, same a11y contract.
