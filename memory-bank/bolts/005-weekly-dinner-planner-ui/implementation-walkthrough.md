---
stage: implement
bolt: 005-weekly-dinner-planner-ui
created: 2026-08-26T22:00:47Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (bolt 3 of 4)

### Summary

Added the shopping list: merged, category-grouped ingredients from the plan's 3 picks, a one-tap Copy to clipboard, and an "Also lock this week's plan" checkbox (checked by default) controlling whether copying also locks the plan.

### Structure Overview

New `src/features/shopping-list/` feature: pure `aggregate.ts` (merge/group) and `format.ts` (plain-text rendering) separated from the `ShoppingListPage` component so the risky logic is directly unit-testable, following the same pattern as `dinners/filters.ts` and `weekly-plan/toggle-selection.ts`. Small, targeted additions to the two features this bolt depends on (`dinners/api.ts`, `weekly-plan/api.ts` + `hooks.ts`) rather than routing everything through the new feature.

### Completed Work

- [x] `src/features/shopping-list/types.ts` — `ShoppingListItem`, `ShoppingListGroup`
- [x] `src/features/shopping-list/aggregate.ts` — `buildShoppingList`: merges by normalized name+unit, groups by category (falls back to "Other"), sorts categories and items alphabetically
- [x] `src/features/shopping-list/format.ts` — `formatShoppingListText`: category heading + `- {quantity} {unit} {name}` lines, blank line between groups
- [x] `src/features/shopping-list/hooks.ts` — `useShoppingListDinners`: fetches the 3 picked dinners' full ingredient lists, enabled only once there are exactly 3 ids
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` — gate message under 3 picks, grouped list, lock checkbox, Copy button, success/clipboard-fallback/lock-error states
- [x] `src/features/dinners/api.ts` — added `fetchDinnersByIds` (by id, regardless of `is_active` — a locked plan's picks must still show even if later suppressed)
- [x] `src/features/weekly-plan/api.ts` — added `lockPlan` (wraps the `lock_weekly_plan` RPC)
- [x] `src/features/weekly-plan/hooks.ts` — added `useLockPlan`
- [x] `src/App.tsx` — added `/shopping-list` route
- [x] `src/shared/components/Layout.tsx` — added "Shopping List" nav link

### Key Decisions

- **Copy and lock decoupled via a checkbox** (checked by default): revised from the original plan mid-Stage-1 per explicit user request — see `construction-log.md` Replanning History and the updated story `006-copy-shopping-list-to-clipboard`.
- **`fetchDinnersByIds` instead of reaching into `weekly-plan`'s embedded selection data**: keeps the shopping list's ingredient needs independent of what `weekly-plan` happens to embed, and correctly ignores `is_active` (suppression shouldn't hide a dinner's ingredients from an already-locked plan's shopping list).
- **Clipboard fallback is a read-only, auto-selecting `Textarea`**, not a custom copy-to-clipboard polyfill — simplest option that satisfies the story's edge case without extra dependencies.

### Deviations from Plan

- Copy/lock decoupling — see Key Decisions above; already reflected in the (revised) `implementation-plan.md` before implementation began, so not a mid-implementation deviation, just noting the origin.

### Dependencies Added

None — no new npm packages.

### Developer Notes

- The lock checkbox is disabled (and shown checked) once the plan is already locked, since there's nothing left to lock — re-copying still works.
- `pnpm run lint`, `pnpm exec tsc -b`, `pnpm run build`, and the existing test suite (24/24) all pass clean.
