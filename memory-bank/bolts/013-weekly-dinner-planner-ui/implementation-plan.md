---
stage: plan
bolt: 013-weekly-dinner-planner-ui
created: 2026-08-27T07:20:00Z
---

## Implementation Plan: weekly-dinner-planner-ui (follow-up: week navigation + store config)

### Objective

Add ◀/▶ past/future week navigation to the plan view (FR-11), and a grocery store configuration page that lets the wife define her store's row order and reorders the shopping list to match (FR-12) — the last bolt in this post-deployment enhancement round.

### Deliverables

**Week navigation (story `013-week-navigation-view`)**

- `src/features/weekly-plan/api.ts`: `fetchPlanByStartDate(startDate)` — same embed shape as `fetchCurrentPlan`, filtered by exact `start_date` instead of "most recent."
- `src/features/weekly-plan/hooks.ts`: `useWeekByOffset(offset: number)` — `offset = 0` is the current/latest plan (reuses `fetchCurrentPlan`'s anchor date); negative offsets compute `anchorDate - 7*|offset|` days and call `fetchPlanByStartDate`. `▶` is disabled at `offset = 0` (can't browse into weeks that don't exist yet).
- `src/features/weekly-plan/date.ts` (new): small pure helpers — `formatWeekRange(startDate)` (→ "8/23 – 8/29") and `shiftWeek(startDate, weeks)` — both unit-tested.
- `src/features/weekly-plan/components/PlanPage.tsx`: extend with `◀`/`▶` controls and a date-range header. At `offset = 0`: today's existing editable pick/remove behavior, unchanged. At any other offset: read-only (no pick/remove controls), an "Eaten" badge when `locked_at` is set (this is the same signal `009-meal-history-schema`'s trigger keys off — no separate `meal_history` query needed, since the domain model already established locked ⟺ history exists), and a clear "No plan this week" state when no plan exists for that date.

**Grocery store config (story `014-grocery-store-config-page`)**

- `src/features/store-config/` (new feature folder — types.ts, api.ts, hooks.ts, components/StoreConfigPage.tsx), following this codebase's feature-based structure.
  - `types.ts`: `GroceryStoreRow`, `CategoryRowAssignment` row types from `Database`.
  - `api.ts`: `fetchRows()`, `addRow(name)` (client computes `position = count + 1`), `reorderRow(rowId, newPosition)` (wraps the `reorder_grocery_store_row` RPC), `deleteRow(rowId)`, `fetchAssignments()`, `assignCategory(category, rowId)` (upsert), `fetchDistinctCategories()` (derives from `dinner_ingredients.category`, deduped client-side — same pattern `CatalogPage.tsx` already uses for the cuisine filter list).
  - `hooks.ts`: `useRows()`, `useAddRow()`, `useReorderRow()`, `useDeleteRow()`, `useAssignments()`, `useAssignCategory()`, `useDistinctCategories()`.
  - `components/StoreConfigPage.tsx`: list of rows (Up/Down move buttons — no drag-and-drop, per `ux-guide.md`'s low-fuss interaction style — plus Delete), an "Add row" input, and a category-assignment section (one row-select dropdown per distinct ingredient category).
- `src/features/shopping-list/reorder.ts` (new): `reorderGroupsByRows(groups, rows, assignments): ShoppingListGroup[]` — pure function, unit-tested (mirrors `aggregate.test.ts`'s style): sorts `buildShoppingList`'s output by each category's assigned row position; unassigned categories fall back to alphabetical order after all configured rows (today's existing behavior, unchanged when no config exists).
- `src/features/shopping-list/components/ShoppingListPage.tsx`: call `reorderGroupsByRows` after `buildShoppingList`, using rows/assignments from the new hooks.
- `src/App.tsx` / `src/shared/components/Layout.tsx`: new `/store-config` route + nav link ("Store Setup").

### Dependencies

- `010-weekly-planning` (complete): `meal_history`/lock semantics — reused via existing `locked_at`, no new query needed.
- `011-grocery-store-config` (complete): `grocery_store_rows`, `category_row_assignments`, `reorder_grocery_store_row` RPC.

### Technical Approach

- **Week navigation reuses `PlanPage`**, rather than a new route — the story is about browsing from "this week's plan," not a separate page; `/plan` already owns that concern.
- **"Eaten" reuses `locked_at`**, not a `meal_history` existence query — per `010-weekly-planning`'s domain model, these are equivalent for every plan that reaches this UI (the trigger guarantees `meal_history` rows exist iff `locked_at` is set). Saves a redundant round-trip.
- **Store-config UI uses plain Up/Down buttons**, not drag-and-drop — matches every other interactive control in this app so far (checkboxes, inline buttons), and the row count is always small at household scale.
- **Distinct-categories list is derived client-side** from `dinner_ingredients`, same pattern already used for the cuisine filter — no new schema/view needed.

### Acceptance Criteria

Directly from stories `013-week-navigation-view` and `014-grocery-store-config-page` (see those files for the full Given/When/Then list); summarized:

- [ ] ◀/▶ navigate exactly one week at a time; ▶ stops at the current/latest plan
- [ ] Past weeks render read-only with an "Eaten" indicator when locked; a week with no plan shows a clear empty state
- [ ] Rows can be added, reordered (Up/Down), and deleted; categories can be assigned/reassigned to a row
- [ ] Shopping list groups reorder by the configured row sequence; falls back to alphabetical when unconfigured
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?
