---
stage: implement
bolt: 013-weekly-dinner-planner-ui
created: 2026-08-27T08:00:00Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (follow-up: week navigation + store config)

### Summary

Added ◀/▶ week navigation to the plan view (past weeks read-only, with an "Eaten" indicator once locked, and a clear empty state for skipped weeks), and a new grocery store configuration page (row add/reorder/delete, category assignment) wired into the shopping list's group ordering.

### Structure Overview

Week navigation extends the existing `weekly-plan` feature module (new pure date helpers, a new hook, `PlanPage.tsx` updated in place). Store configuration is a new feature folder (`src/features/store-config/`), following this codebase's established types → api → hooks → components layering. The shopping-list reorder logic is a new pure function in the existing `shopping-list` feature, consumed by `ShoppingListPage.tsx`.

### Completed Work

- [x] `src/features/weekly-plan/date.ts` (new) — `shiftWeek`, `formatWeekRange`, `todayIsoDate` (moved here from `hooks.ts`)
- [x] `src/features/weekly-plan/api.ts` — added `fetchPlanByStartDate`
- [x] `src/features/weekly-plan/hooks.ts` — added `useWeekByOffset`; imports `todayIsoDate` from `date.ts` instead of a local copy
- [x] `src/features/weekly-plan/components/PlanPage.tsx` — ◀/▶ controls, date-range header, read-only rendering + "Eaten" badge for past weeks, "No plan this week" empty state
- [x] `src/features/store-config/types.ts`, `api.ts`, `hooks.ts` (new) — rows/assignments CRUD, wraps the `reorder_grocery_store_row` RPC
- [x] `src/features/store-config/components/StoreConfigPage.tsx` (new) — row list with Up/Down/Delete, add-row input, per-category row-assignment selects
- [x] `src/features/dinners/api.ts` — added `fetchDistinctIngredientCategories` (feeds the store-config page's category list)
- [x] `src/features/shopping-list/reorder.ts` (new) — `reorderGroupsByRows`, pure function
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` — calls `reorderGroupsByRows` after `buildShoppingList`
- [x] `src/App.tsx`, `src/shared/components/Layout.tsx` — new `/store-config` route + "Store Setup" nav link
- [x] New tests: `date.test.ts`, `reorder.test.ts`, `StoreConfigPage.test.tsx`; extended `PlanPage.test.tsx` with 3 week-navigation tests
- [x] Fixed a real gap found while implementing: `ShoppingListPage.test.tsx` didn't mock `@/features/store-config/api`, so it was making live network calls to the real Supabase project during tests (harmless reads, but non-hermetic) — added the missing mock

### Key Decisions

- **Week navigation extends `PlanPage`, not a new route** — matches the plan's stated reasoning; `/plan` already owns "this week's plan."
- **"Eaten" reuses `locked_at`**, not a separate `meal_history` query — per `010-weekly-planning`'s domain model, these are equivalent for every plan reaching this UI.
- **`todayIsoDate` moved to `date.ts`** — it's now shared between `hooks.ts` (new-plan creation) and the new week-navigation anchor logic; centralizing date logic in one small, well-tested module was cleaner than a second copy.
- **Store-config page uses plain Up/Down buttons**, matching every other interactive control in this app (no new drag-and-drop dependency).

### Deviations from Plan

None — implementation matches `implementation-plan.md` as approved.

### Dependencies Added

None — built entirely on existing dependencies.

### Developer Notes

- `useWeekByOffset(0)` reuses `useCurrentPlan()` directly rather than issuing a redundant fetch — the anchor date for all other offsets comes from that same query's `start_date` (falling back to today when no plan exists at all).
- Ran `npx tsc -b`, `npx eslint .`, `npx vitest run` (98/98 passing), and `npx vite build` — all clean.
