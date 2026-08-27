---
stage: implement
bolt: 017-kitchen-table-ui
completed: '2026-08-27T13:20:00Z'
---

## Implementation Walkthrough: kitchen-table-ui (This Week + Shopping List restyle)

### What changed

**This Week (`008-this-week-restyle-week-nav`)** — `PlanPage.tsx` rewritten:

- Header: `textStyle="eyebrow"` date range + `textStyle="pageTitle"` "This week's plan"; ◀/▶
  are now ghost `IconButton`s using `uiIcons.back` (`ChevronLeft`) and the new
  `uiIcons.nextWeek` (`ChevronRight`, added to the icon vocabulary alongside a new
  `uiIcons.eaten` (`CalendarCheck`), `uiIcons.allDone` (`Sparkles`), and `uiIcons.shoppingList`
  (`ShoppingBasket`)).
- Each selection is a `brand.50` row: a 34px `brand.500` numbered circle, name (`cardTitle`) +
  metadata (`meta`), and a 36px outline `X` icon button to remove.
- All-picked state: a `cardDashed` card with the `allDone` sparkle, "All three picked. Your
  shopping list is ready.", and a solid "See shopping list" button (`RouterLink` to
  `/shopping-list`) with a `shoppingList` icon.
- Empty/no-plan and skipped-week states both use the same `cardDashed` card instead of plain
  text (the skipped-week case keeps its exact copy, "No plan this week.").
- The old plain "N/3 selected" text is gone — not called for in the restyle, and redundant next
  to the numbered rows.

**Shopping List (`009-shopping-list-restyle`)** — `ShoppingListPage.tsx` rewritten:

- Header: eyebrow "N dinners · N items" + `pageTitle` "Shopping list", a 40px `brand.100`
  `Copy`-icon tile (decorative — the actual action lives in the footer).
- Each category group: `categoryIcon` + `sectionLabel` + a `line.subtle` rule box (`flex={1}`)
  filling the remaining row width.
- Each item: a 19px `Checkbox` (own local state, not persisted) + a `56px`-min-width
  quantity/unit column (`fontWeight 500`, `ink.500`) + the item name — both turn `ink.200` with
  a strikethrough when checked. Checked state keyed by `` `${category}-${name}-${unit}` `` in a
  local `Set<string>`, per the story's technical notes.
- Lock checkbox + Copy button moved into a `position="sticky"` bottom footer; Copy is now a
  full-width `size="lg"` (52px) solid button with a `Copy` icon, `colorScheme="teal"` removed
  (not a Kitchen Table token — the theme's default solid `Button` variant is already olive).
- `buildShoppingList`/`reorderGroupsByRows`/`formatShoppingListText`/lock-and-copy logic are
  completely unchanged.

### Test fixes required by the restyle

- `PlanPage.test.tsx`: dropped the `'2/3 selected'` assertion (that text no longer renders);
  added a new test for the all-picked dashed card + "See shopping list" link.
- `ShoppingListPage.test.tsx`: `getByText(/3 each onion/)` relied on quantity/unit/name being
  direct text-node children of one element — now that quantity/unit and name are visually
  separate columns (two elements), Testing Library's default text matcher (which only joins an
  element's own direct text nodes, not descendant elements) no longer matches the combined
  string. Split into two queries: `getByText('3 each')` and `getByText('onion')`.

### Verification

- `npx tsc -b`, `npx eslint .`, `npx vitest run` (123/123 passing across 20 files), and
  `npx vite build` all pass clean.
- Not live-verified in browser — both screens require an authenticated session, and this
  environment still has no test credentials (same limitation as bolts 015/016).

### Acceptance criteria

- [x] This Week: eyebrow/title header, numbered pick rows with remove, all-picked dashed card + CTA, week-nav arrows from the icon vocabulary, Eaten badge, dashed empty state
- [x] Shopping List: eyebrow/title/count-tile header, category rule rows, checkbox + column
      item rows with local check-off state, sticky footer with restyled Copy button
- [x] `tsc -b`, `eslint`, `vitest run`, `vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 3 (Test)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
