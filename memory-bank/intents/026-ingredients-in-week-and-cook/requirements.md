---
intent: 026-ingredients-in-week-and-cook
phase: inception
status: complete
created: '2026-10-18T21:46:16Z'
updated: '2026-10-18T22:15:19Z'
---

# Requirements: See a picked dinner's ingredients on This week and Cook

## Intent Overview

Ingredients appear in only one place: the catalog card's Details. Once a dinner is picked, the
household has to go back to the catalog to see what goes into it. That applies when looking over the
week on This week and when standing at the stove on the Cook tab. This intent shows a picked dinner's
ingredients on both tabs.

**Type**: brown-field (enhancement)
**Origin**: product owner request, 2026-10-18. It started as This week only. The Cook tab was added
before Checkpoint 1.

### What the code shows

| Where                    | File                                      | Today                                                                                                                                   |
| ------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| This week, phone rows    | `PlanPage.tsx` (non-`threeAcross` branch) | Badge, name, `cuisine · N min`, remove button. No expand                                                                                |
| This week, desktop cards | `PlanPage.tsx` (`threeAcross` branch)     | Badge, remove button, name, meta. No expand                                                                                             |
| Cook tab                 | `CookingViewPage.tsx`                     | A per-row expand (`aria-expanded`, several open at once) that shows **steps only**                                                      |
| Catalog card Details     | `DinnerCard.tsx` `DinnerCardDetails`      | Ingredients (category icon, then `quantity unit name`), steps, and tag management. Loaded on expand by `useDinnerFullDetails(id, true)` |

Data:

- This week's `useWeekByOffset` loads `weekly_plan_selections(*, dinners(*))`, with no ingredients
- The Cook tab's `fetchDinnersWithStepsByIds` selects `*, dinner_steps(*)`, with no ingredients.
  Adding `dinner_ingredients(*)` to that select covers the Cook tab in the same request
- `useDinnerFullDetails` (the catalog card's query) already returns ingredients for a single dinner
- Quantities are stored already scaled at entry (intent 018), so they're shown as stored
- No schema change. `dinner_ingredients` is already readable under the household's RLS

## Scope (before Checkpoint 1)

- **This week**: an expand control on each picked dinner, in both the phone and desktop layouts.
  When expanded, the dinner's ingredients, laid out as on the catalog card
- **Cook tab**: the existing expand shows the ingredients as well as the steps

## Out of scope

- Changing what the shopping list shows
- Editing ingredients from This week or Cook
- Cooking mode improvements (step check-off, timer, next and previous step). These are still
  deferred in `tasks.md`

## Checkpoint 1 answers (2026-10-18)

- **This week shows ingredients and steps**, to stay consistent with the catalog's Details. Tag
  editing stays in the catalog
- **Past weeks expand too**
- **Desktop: all three open together**
- **Empty dinners show "No ingredients recorded."**

The Cook tab's order and opening behaviour weren't answered. These requirements take the defaults
that were offered: ingredients before steps, matching the catalog, and rows that stay collapsed until
tapped, with several open at once, as now.

## Functional Requirements

### FR-1: A picked dinner on This week expands

- **Description**: Every picked dinner on This week has an expand control, in both the phone rows
  and the desktop cards. It's there for the current week, locked or not, and for past weeks.
- **Acceptance Criteria**:
  - Each dinner has a button with `aria-expanded`, labelled `Expand {name}` when closed and
    `Collapse {name}` when open, with the same expand and collapse icons as the Cook tab
  - Every dinner starts collapsed when the page loads and when the week changes
  - On the current, unlocked week, the remove button is separate from the expand button. Removing
    a dinner doesn't expand it, and expanding it doesn't remove it
  - Past and locked weeks have no remove button, as now, but still expand
- **Priority**: Must

### FR-2: The expanded dinner shows its ingredients, then its steps

- **Description**: An expanded dinner on This week shows an **Ingredients** section, then a
  **Steps** section. Both look the same as in the catalog card's Details, without the Tags section.
- **Acceptance Criteria**:
  - Ingredients: one line each, with the category icon, then `quantity unit name`, in the catalog's
    order
  - Steps: in `step_number` order, each with its step icon, as in the catalog
  - With no ingredients: "No ingredients recorded." With no steps: "No steps recorded." (the
    catalog's wording)
  - While loading: a small spinner in the expanded area. On failure: "Couldn’t load details for
    this dinner." The rest of the page keeps working either way
  - No tags and no editing
- **Priority**: Must

### FR-3: On desktop the three cards open together; on phone each row opens on its own

- **Description**: In the desktop three-across layout, any card's expand button opens all the
  cards, and any card's collapse button closes them all. In the phone layout, each row opens and
  closes independently, and several can be open at once.
- **Acceptance Criteria**:
  - Desktop (`md` and up): after one expand, every card shows `aria-expanded="true"` and its
    ingredients and steps. After one collapse, none do
  - Phone (below `md`): expanding one row leaves the others as they were
  - Resizing across the breakpoint doesn't need to keep the open state (open state is
    per-layout)
- **Priority**: Must

### FR-4: The Cook tab's expanded row shows ingredients above the steps

- **Description**: When a Cook tab row is expanded, it shows an **Ingredients** section, then the
  steps it shows today. Collapsed rows, the meta line, and the expand behaviour are unchanged.
- **Acceptance Criteria**:
  - Ingredients use the same format as FR-2 (category icon, then `quantity unit name`), under an
    "Ingredients" label, with a "Steps" label above the steps
  - The steps keep their current Cook-tab styling (boxed rows with a 30px icon tile), so they're
    readable at the stove
  - With no ingredients: "No ingredients recorded." The existing "No steps available for this dinner
    yet." stays as it is
  - Rows still start collapsed, and several can be open at once
- **Priority**: Must

### FR-5: One ingredient list, used everywhere

- **Description**: The ingredient list that the catalog card's Details renders becomes a shared
  component. The catalog, This week and the Cook tab all render it, so the three can't drift apart.
  This week also shares the catalog's step list.
- **Acceptance Criteria**:
  - The catalog's Details renders the same as before (its existing tests pass unchanged)
  - This week's expanded view and the Cook tab's Ingredients section render the shared ingredient
    component
- **Priority**: Should

## Non-Functional Requirements

### NFR-1: No new requests on page load

- **This week**: a dinner's details are fetched only when it's expanded, through
  `useDinnerFullDetails`. That means one request per dinner, cached under the same key as the
  catalog's, so a dinner already opened in the catalog shows instantly
- **Cook tab**: ingredients come in the request that already loads the steps, by adding
  `dinner_ingredients(*)` to `fetchDinnersWithStepsByIds`. There's still one request for the page

### NFR-2: No schema, RLS or Edge Function change

`dinner_ingredients` is already readable by the household. `git diff -- supabase/` is empty for
this intent.

### NFR-3: Accessible and testable

- The expand controls are real buttons, reachable by keyboard, with `aria-expanded` and the labels
  from FR-1
- Every FR has Vitest and RTL coverage, with desktop tests at 1280px using the `matchMedia` stub
  pattern from `PlanPage.test.tsx`. Lint, typecheck and the full suite pass
- A browser check at 390px and at desktop width before release
