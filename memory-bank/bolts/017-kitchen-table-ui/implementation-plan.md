---
stage: plan
bolt: 017-kitchen-table-ui
created: 2026-08-27T13:00:00Z
---

## Implementation Plan: kitchen-table-ui (This Week + Shopping List restyle)

### Objective

Restyle `PlanPage.tsx` (This Week, including the week-nav arrows from the earlier enhancement
round) and `ShoppingListPage.tsx`, per stories `008` and `009`.

### Deliverables

**This Week (`008-this-week-restyle-week-nav`)**

- `PlanPage.tsx`: eyebrow (week's date range) + `pageTitle` "This week's plan"; ◀/▶ as ghost
  `IconButton`s (`ChevronLeft`/new `ChevronRight`, added to the icon vocabulary as
  `uiIcons.nextWeek`) instead of literal `◀`/`▶` text; each selection becomes a `brand.50` row
  with a 34px olive numbered circle (1/2/3), name + metadata, and a 36px outline `X`
  `IconButton` to remove; a dashed `cardDashed` card closes the list once all 3 are picked
  (`Sparkles`/`uiIcons.allDone`, "All three picked. Your shopping list is ready.", an olive
  "See shopping list" button linking to `/shopping-list`); "Eaten" badge (`CalendarCheck` via
  new `uiIcons.eaten`) for a past locked week; skipped/empty weeks use the same `cardDashed`
  convention instead of plain text.
- Drops the old plain "N/3 selected" running-count text — the numbered rows already convey
  progress, and it read as redundant chrome next to the new dashed "all done" card.

**Shopping List (`009-shopping-list-restyle`)**

- `ShoppingListPage.tsx`: eyebrow "N dinners · N items" + title "Shopping list", 40px
  `brand.100` `Copy`-icon tile top-right (decorative); each category group gets a
  `categoryIcon` + `sectionLabel` + a `line.subtle` rule filling the remaining width; each item
  gets a 19px checkbox + a quantity/unit column (500 weight, `ink.500`, 56px min-width) + name,
  with local-only checked state (`ink.200` + strikethrough, a `Set<string>` keyed by
  `category-name-unit`, never persisted); the lock-checkbox + Copy action move into a sticky
  footer, Copy restyled as a full-width 52px olive button with a `Copy` icon.
- No change to `buildShoppingList`/`reorderGroupsByRows`/`formatShoppingListText` — this story
  is presentation-only.

### Dependencies

- `001-design-token-foundation`, `002-icon-vocabulary` (bolt `014`, complete)
- `004-grocery-store-config`'s `reorderGroupsByRows` (existing, unchanged)

### Technical Approach

- Both pages keep every existing hook/mutation call (`useWeekByOffset`, `useToggleSelection`,
  `useCurrentPlan`, `useLockPlan`, `useShoppingListDinners`, `buildShoppingList`,
  `reorderGroupsByRows`) untouched — only JSX/markup changes.
- Splitting an item's quantity/unit from its name into two elements (for the 56px column
  alignment) changes how `ShoppingListPage.test.tsx`'s combined-text assertion
  (`getByText(/3 each onion/)`) resolves, since Testing Library's default text matcher only
  joins an element's own direct text-node children, not descendant elements' text. Update that
  assertion to two separate queries (`getByText('3 each')`, `getByText('onion')`) rather than
  one combined regex.
- `PlanPage.test.tsx`'s `'2/3 selected'` assertion is dropped along with the running-count text
  it checked; a new test covers the all-picked dashed card + shopping-list link instead.

### Acceptance Criteria

Directly from stories `008` and `009` (see those files for the full Given/When/Then list);
summarized:

- [ ] This Week: eyebrow/title header, numbered pick rows with remove, all-picked dashed card + CTA, week-nav arrows from the icon vocabulary, Eaten badge, dashed empty state
- [ ] Shopping List: eyebrow/title/count-tile header, category rule rows, checkbox + column
      item rows with local check-off state, sticky footer with restyled Copy button
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
