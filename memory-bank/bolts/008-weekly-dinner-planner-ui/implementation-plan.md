---
stage: plan
bolt: 008-weekly-dinner-planner-ui
created: 2026-08-26T23:03:51Z
---

## Implementation Plan: weekly-dinner-planner-ui (bolt 5; cooking view, added later)

### Objective

A dedicated "Cooking" page showing the current plan's 3 dinners, each with its ordered, step-by-step instructions — usable whether the plan is locked or not, with a clear prompt state when fewer than 3 dinners are picked.

### Deliverables

**New feature: `src/features/cooking-view/`**
- `hooks.ts` — `useDinnersWithSteps(dinnerIds: string[])`: `react-query` wrapper, `enabled` only when there are exactly 3 ids
- `components/CookingViewPage.tsx` — the "Cooking" page: gate message under 3 picks (same shape as `ShoppingListPage`'s), each dinner rendered as a card with its steps as an ordered `<ol>` list, a fallback note for a dinner with zero steps

**`dinners` feature**
- `types.ts`: add `DinnerStep`, `DinnerWithSteps` (derived from `Database['public']['Tables']['dinner_steps']['Row']` and the generated types from bolt `007-dinner-catalog`)
- `api.ts`: add `fetchDinnersWithStepsByIds(ids: string[])` — embeds `dinner_steps(*)` ordered by `step_number`, separate from `fetchDinnersByIds` (which embeds ingredients) so the shopping list and cooking view each fetch only what they need

**Routing & nav**
- `App.tsx`: add `/cooking` → `CookingViewPage`
- `Layout.tsx`: add a "Cooking" nav link

### Dependencies

- `007-dinner-catalog` (complete): `dinner_steps` schema + content
- `004-weekly-dinner-planner-ui` (complete): current plan/selections this bolt reads
- No new npm packages

### Technical Approach

- **Separate fetch from the shopping list's**, per the story's own "reuse where practical" note weighed against `005`'s existing `fetchDinnersByIds`/`useShoppingListDinners`: reusing the *current-plan-selections* data (via `useCurrentPlan()`) is practical and done; reusing the *ingredient* fetch is not, since ingredients and steps are different embeds with no benefit to combining them here — a dedicated `fetchDinnersWithStepsByIds` keeps each page's query minimal, consistent with the dinners feature's existing one-function-per-need pattern.
- **Works regardless of lock state**: the page reads `useCurrentPlan()` the same way `ShoppingListPage` does, with no lock-based branching — per the story, locking must not hide or change this view.
- **Availability gate**: shown whenever `weekly_plan_selections.length === 3` (locked or not); otherwise a prompt state linking to the catalog/plan, mirroring `ShoppingListPage`'s existing gate message and styling.
- **Zero-steps edge case**: if a dinner's `dinner_steps` array is empty (a data gap), render that dinner's card with a plain "No steps available for this dinner yet." note instead of an empty list — never a blank/broken section.
- **Ordered, numbered rendering**: steps render as an `<ol>` (Chakra's `OrderedList`/`ListItem`), not a paragraph, satisfying the story's explicit "not a paragraph" requirement.

### Acceptance Criteria

- [ ] With exactly 3 dinners selected, the cooking view shows all 3, each with its steps as an ordered, numbered list
- [ ] With fewer than 3 selections (or no plan at all), a clear prompt state shows instead of a broken/partial view
- [ ] The cooking view and shopping list are reachable as separate routes, not tabs
- [ ] Once the plan is locked, revisiting the cooking view still shows the same 3 dinners' steps unchanged
- [ ] A dinner with zero steps shows a fallback note rather than a blank section
