---
stage: plan
bolt: 034-desktop-layout-ui
created: 2026-08-28T20:15:00Z
---

## Implementation Plan: desktop-layout-ui — bolt 034 (catalog xl + pointer states)

### Objective

Move the catalog's third column to `xl`, and add the hover/cursor feedback a pointer expects.
Last bolt of the intent.

### Deliverables

**Story 007 — `CatalogPage.tsx`** (one line)

- `SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }}` → `columns={{ base: 1, sm: 2, xl: 3 }}` (L122).
- Page cap 1080px is already in place (`/` ∈ `WIDE_ROUTES`, bolt `032`).

**Story 008 — pointer / hover states**

- `DinnerCard.tsx` (root `<Box layerStyle={…} …>`, L239): add `_hover={{ borderColor: 'line.brand' }}`
  and extend `transition` to include `border-color`. Border signal only — no bg change.
- `ShoppingListPage.tsx` item rows: fold the qty + name `Text`s into the `<Checkbox>` as its label
  children so the whole line toggles; add `w="full"`, `px={2} py={1} borderRadius="control"`,
  `_hover={{ bg: 'paper.subtle' }}`; drop the now-redundant `aria-label` (visible text is the
  label). Keep the strikethrough / `ink.200` checked styling on the texts.
- `CookingViewPage.tsx` accordion header (`<Box as="button">`, L94): add `cursor="pointer"`; on the
  outer card `<Box layerStyle={…}>` add `_hover={!isExpanded ? { borderColor: 'line.brand' } : undefined}`
  and a `transition`.

### Dependencies

- Bolt `032` (measure cap). Independent of bolt `033`.

### Technical Approach

- Global focus ring already shipped in intent `003` bolt `023` — this is hover / cursor only.
- No `useBreakpointValue` needed; all changes are CSS-responsive props or static `_hover`.
- `getByText('onion')` in `ShoppingListPage.test` still resolves after the item text moves inside
  the `Checkbox` label; no test asserts the item checkbox by name.

### Acceptance Criteria

- [ ] Catalog grid `columns={{ base: 1, sm: 2, xl: 3 }}`; page capped 1080px
- [ ] `DinnerCard` hover = `line.brand` border, no bg change
- [ ] Shopping-list item rows toggle from anywhere on the line, with a `paper.subtle` hover
- [ ] Cooking accordion header has a pointer cursor and the collapsed card shifts border on hover
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green

### Out of Scope

- Making the whole `DinnerCard` clickable (border is the signal, per the README)
