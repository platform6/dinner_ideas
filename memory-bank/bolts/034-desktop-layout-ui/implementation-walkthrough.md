---
stage: implement
bolt: 034-desktop-layout-ui
created: 2026-08-28T20:20:00Z
---

## Implementation Walkthrough: desktop-layout-ui — bolt 034 (catalog xl + pointer states)

### Summary

Moved the catalog's third column from `lg` to `xl`, and added the hover/cursor feedback a pointer
expects: a border shift on dinner cards and the collapsed cooking card, a fully-clickable
shopping-list row with a hover fill, and a pointer cursor on the cooking accordion header.

### Completed Work

- [x] `src/features/dinners/components/CatalogPage.tsx` — `columns={{ base: 1, sm: 2, lg: 3 }}` →
      `{ base: 1, sm: 2, xl: 3 }`
- [x] `src/features/dinners/components/DinnerCard.tsx` — root card `<Box>`:
      `_hover={{ borderColor: 'line.brand' }}` + `border-color` in `transition` (no bg change — the
      card is a container of controls)
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` — each item row is now a single
      `<Checkbox w="full" px={2} py={1} _hover={{ bg: 'paper.subtle' }}>` whose label children are the
      qty + name `HStack`, so clicking anywhere on the line toggles it; the redundant `aria-label` is
      dropped (the visible text is the accessible name); strikethrough / `ink.200` checked styling kept
- [x] `src/features/cooking-view/components/CookingViewPage.tsx` — outer card `<Box>` gets
      `_hover={isExpanded ? undefined : { borderColor: 'line.brand' }}` + `transition`; the header
      `<Box as="button">` gets `cursor="pointer"`

### Key Decisions

- **`DinnerCard` hover is border-only** — per the README, the card isn't itself clickable, so a bg
  change would over-signal.
- **Shopping-list row toggling via `Checkbox` label children** rather than a separate `<label
htmlFor>` — no id plumbing, and the whole 44px-tall row becomes the hit target (helps on phone
  too).

### Deviations from Plan

None.

### Dependencies Added

None.

### Verification Run (this stage)

- [x] `npm run build` — clean
- [x] `npm run lint` — clean
- [x] `npm run test` — 134 / 134 (no test changes; `getByText('onion')` still resolves with the
      item text now inside the checkbox label)

### Developer Notes

The global focus ring for these controls already shipped in intent `003` bolt `023`; this bolt is
hover / cursor only. Hover states are not meaningfully testable in jsdom — browser-verified.
