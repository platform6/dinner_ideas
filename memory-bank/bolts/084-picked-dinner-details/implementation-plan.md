---
stage: plan
bolt: 084-picked-dinner-details
created: '2026-10-18T22:25:55Z'
---

## Implementation Plan: picked-dinner-details

### Objective

The catalog's ingredient and step lists become shared components. This week expands a picked dinner
to show them, opening all three cards together on desktop and one row at a time on phone. The Cook
tab's expand adds ingredients above its existing steps.

### Deliverables

- `src/features/dinners/components/IngredientList.tsx`: takes `ingredients: DinnerIngredient[]`
  and renders the catalog's list (category icon, then `quantity unit name`), or "No ingredients
  recorded." With tests
- `src/features/dinners/components/StepList.tsx`: takes `steps: DinnerStep[]` and renders the
  catalog's ordered list (step icon, then instruction), or "No steps recorded." With tests
- `DinnerCard.tsx`: `DinnerCardDetails` renders the two components under its existing labels.
  Tags are untouched, and so are its existing tests
- `src/features/weekly-plan/components/PickedDinnerDetails.tsx`: takes `dinnerId`, calls
  `useDinnerFullDetails(dinnerId, true)`, and renders "Ingredients" and then "Steps", with the
  catalog's spinner and error text. It's only mounted while expanded, so it only fetches then
- `PlanPage.tsx`: an expand button on each phone row and desktop card, with the open state
  described below, and `PickedDinnerDetails` under the dinner when it's open
- `src/features/dinners/types.ts` and `api.ts`: a new `DinnerWithStepsAndIngredients`, with
  `fetchDinnersWithStepsByIds` selecting `*, dinner_steps(*), dinner_ingredients(*)` and returning
  it. `useDinnersWithSteps` follows
- `CookingViewPage.tsx`: the expanded area gets "Ingredients" with `IngredientList`, then a
  "Steps" label over the existing steps, with their styling and empty text unchanged
- Tests: PlanPage (phone and desktop, current and past week), CookingViewPage, and the two new
  components

### Dependencies

- `useDinnerFullDetails` / `fetchDinnerFullDetails` (`src/features/dinners/`): This week's data,
  cached with the catalog's
- `uiIcons.expand` / `uiIcons.collapse`: the Cook tab's icons, reused for consistency
- The 1280px `matchMedia` stub in `PlanPage.test.tsx` (intent 025) for the desktop tests
- `fetchDinnersWithStepsByIds` has one caller (`cooking-view/hooks.ts`), so widening its return
  type touches nothing else

### Technical Approach

**Open state on This week.**

- **Phone**: a `Set<string>` of selection ids, toggled per row, as in `CookingViewPage`.
- **Desktop**: one `boolean`. Every card's button reads and flips it, so one tap opens or closes all
  three.
- **Reset**: the week buttons already call `setOffset`, so both states are cleared in those
  handlers rather than in an effect. Everything is collapsed after a week change, and on load.
- **Breakpoint**: phone and desktop keep separate state, so crossing it doesn't carry an open
  state over (FR-3 allows that).

**The expand button.**

- It's an `IconButton` (ghost, 36px, to match the remove button's footprint), with
  `aria-expanded` and the label `Expand {name}` / `Collapse {name}`.
- It's a sibling of the remove button, not a wrapper around the row, so the two can't trigger
  each other.
- It shows on every week: past and locked weeks have no remove button, but the expand is still
  there.

**Layout.**

- **Phone**: the row stays an `HStack`, with the expand button after the remove button. The row's
  outer element becomes a `Box` with `layerStyle="cardSelected"`, holding that `HStack` and, when
  open, `PickedDinnerDetails` below it. The name's `Box` gets `minW={0}` so it can wrap
  instead of being squeezed out at 390px.
- **Desktop**: the top `HStack` holds the badge on the left, and the remove and expand buttons on
  the right. The details go at the end of the card's `Stack`. `SimpleGrid` already gives a row of
  cards equal height, so the three stay level when open.

**Details content.** `PickedDinnerDetails` matches `DinnerCardDetails`: a top border, a
`sectionLabel` "Ingredients", then `IngredientList`, a `sectionLabel` "Steps", then `StepList`.
There are no tags and nothing to edit.

**Cook tab.** In the `isExpanded` block, "Ingredients" and `IngredientList` go first, then a
`sectionLabel` "Steps" and the existing step rows, or the existing "No steps available..." text.
The test fixture's dinners gain `dinner_ingredients`.

**Ingredient order.** Neither query orders `dinner_ingredients`, so both use Postgres's natural
order, as the catalog does today. I'm not adding an order here, so all three surfaces stay
consistent.

### Acceptance Criteria

- [ ] `IngredientList` and `StepList` render as the catalog does today, with their empty states.
      `DinnerCard` tests pass unedited
- [ ] This week: every dinner, on the current week (locked or not) and past weeks, has an expand
      button with `aria-expanded` and an `Expand`/`Collapse {name}` label
- [ ] Expanded: "Ingredients" and then "Steps", loaded only when open. Spinner while loading, the
      catalog's error text on failure. No tags
- [ ] At 1280px, one expand opens all cards and one collapse closes all. On phone, rows are
      independent and several can be open
- [ ] Collapsed on load and after changing week. Remove and expand don't trigger each other
- [ ] Cook: one request now returns ingredients too. An expanded row shows "Ingredients" and then
      "Steps". Step styling, its empty text, the meta line and several-open are unchanged. A dinner
      with no ingredients shows "No ingredients recorded."
- [ ] `eslint`, `tsc -b` and the full Vitest suite pass. `git diff -- supabase/` is empty
- [ ] Browser check: This week at 390px (row fits with both buttons) and at desktop width (three
      open together), plus the Cook tab
