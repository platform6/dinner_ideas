---
intent: 027-tap-row-to-expand
phase: inception
status: complete
created: '2026-10-19T10:20:41Z'
updated: '2026-10-19T10:20:41Z'
---

# Requirements: Tap a picked dinner's bar to expand it on This week

## Intent Overview

Intent 026 (v0.20.0) gave each picked dinner on This week an expand button, a 36px icon at the end
of the row. Only that icon opens the dinner. The Cook tab, by contrast, opens when you tap anywhere
on the row. This intent makes This week match: tapping the dinner's bar opens or closes it.

**Type**: brown-field (enhancement)
**Origin**: product owner request on 2026-10-19, right after v0.20.0 shipped: "make it so this week
is a click on that full bar as opposed to just the expand icon"

### What the code shows

| Where                    | File                               | Today                                                                                                                                              |
| ------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| This week, phone rows    | `PlanPage.tsx` (non-`threeAcross`) | `Box layerStyle="cardSelected"` > `HStack` (badge, name and meta, then the remove and expand buttons). Details render below. Only the icon toggles |
| This week, desktop cards | `PlanPage.tsx` (`threeAcross`)     | `Stack layerStyle="cardSelected"`: a top `HStack` (badge, remove, expand), the name and meta, then details. Only the icon toggles all three        |
| Cook tab                 | `CookingViewPage.tsx`              | The whole row header is a `<button>` (`aria-expanded`, `cursor="pointer"`), and the card's border turns `line.brand` on hover while collapsed      |

The Cook tab's pattern can't be copied as is: on This week's current, unlocked week the remove
button sits inside the bar, and a button can't contain another button.

## Out of scope

- The Cook tab and the catalog (unchanged)
- What the expanded details show (intent 026, unchanged)

## Checkpoint 1 answers (2026-10-19)

The product owner approved the proposal as offered:

- Phone: the whole bar toggles that row. Desktop: the card's top part toggles all three
- Remove only removes. Taps inside the open details don't toggle
- The expand icon stays as the keyboard and screen-reader control
- v0.20.0's smoke checks carry into this release's smoke test

## Functional Requirements

### FR-1: Tapping the bar toggles the dinner

- **Description**: On This week, a click anywhere on a picked dinner's bar does what its expand
  button does.
- **Acceptance Criteria**:
  - **Phone**: a click on the row's bar (badge, name, meta, or the space between them) opens or
    closes that row only. Other rows stay as they were
  - **Desktop**: a click on a card's top part (the badge row, and the name and meta) opens or
    closes all three cards, as the expand button does
  - Works on every week: current (locked or not) and past
- **Priority**: Must

### FR-2: The buttons and the details don't double up

- **Description**: Clicks on the controls inside the bar do only their own job.
- **Acceptance Criteria**:
  - A click on **remove** removes the dinner and doesn't open or close anything
  - A click on the **expand icon** toggles once (not twice, which would leave it unchanged)
  - A click inside the open **ingredients and steps** area doesn't toggle, so text can be
    selected and the list scrolled
- **Priority**: Must

### FR-3: The bar looks tappable

- **Description**: The bar shows it can be clicked.
- **Acceptance Criteria**:
  - `cursor: pointer` over the bar
  - While collapsed, the card's border turns `line.brand` on hover, as on the Cook tab
- **Priority**: Should

### FR-4: Expand before remove, with a red remove icon

- **Description**: Added during bolt 085 at the product owner's request (2026-10-19). The two
  buttons swap places, so remove sits at the outer edge, and remove's icon turns red.
- **Acceptance Criteria**:
  - Phone rows and desktop cards: the expand icon comes first, then remove
  - Remove's icon is `heart.500`, the app's existing destructive red (the catalog's Remove menu
    item). The button's outline is unchanged
  - Past and locked weeks, which have no remove button, keep the expand icon at the edge
- **Priority**: Must

## Non-Functional Requirements

### NFR-1: Accessible

- The expand icon stays a real button with `aria-expanded` and the `Expand {name}` /
  `Collapse {name}` label, so keyboard and screen-reader use is unchanged
- The bar's click handler is a mouse and touch convenience on a non-interactive element, so it
  adds no extra tab stop and no duplicate announcement

### NFR-2: Front end only, and tested

- No schema, RLS or Edge Function change. `git diff -- supabase/` is empty
- Vitest and RTL tests at 390px and 1280px cover FR-1 and FR-2. Lint, typecheck and the full suite
  pass
- A browser check of the tap target at 390px and at desktop width happens in the smoke test
