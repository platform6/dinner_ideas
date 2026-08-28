---
stage: plan
bolt: 025-frontend-review-ui
created: 2026-08-28T19:15:00Z
---

## Implementation Plan: frontend-review-ui — bolt 025 (shopping-list action bar + card layerStyles)

### Objective

Two per-screen call-site cleanups: fix the shopping-list sticky action bar (clear the tab bar on
phone, relocate the lock + Copy controls to the page header at md+) and switch Plan / Suppressed /
Cooking from hand-rolled cards to the shared `card` / `cardSelected` layerStyles.

### Stories

- **006-shopping-list-action-bar** (Should) — full review finding 3
- **008-card-layerstyles-three-screens** (Could) — review polish 9

### Deliverables

**`src/features/shopping-list/components/ShoppingListPage.tsx`**

- Drop `pb={20}` from the page `Stack` (Layout already applies `pb="70px"` on phone).
- Extract the lock `Checkbox` + "Copy shopping list" `Button` into two `const` JSX fragments so
  they render once, in one of two places:
  - **base**: the existing sticky footer `Box`, with `bottom={{ base: '70px', md: 0 }}` (was `0`).
  - **md+**: a right-aligned `HStack` in the page-header row, replacing the decorative 40px copy
    icon; the sticky footer `Box` is not rendered.
  - Placement chosen with `useBreakpointValue({ base: false, md: true })` — in jsdom this returns
    the base value, so tests keep seeing exactly one lock checkbox / Copy button (in the footer).
- The md+ two-column category-group flow is **not** in scope (intent `004`).

**`src/features/weekly-plan/components/PlanPage.tsx`** (L138)

- `<HStack ... bg="brand.50" borderRadius="card" p={3}>` → `<HStack ... layerStyle="cardSelected">`
  (adds the `line.brandSubtle` hairline the layerStyle carries — accepted minor shift).

**`src/features/dinners/components/SuppressedPage.tsx`** (L69)

- `<HStack ... bg="paper.subtle" borderRadius="card" p={3}>` → `<HStack ... layerStyle="card" bg="paper.subtle">`
  (keep the recessed bg; take radius/padding/border from the layerStyle).

**`src/features/cooking-view/components/CookingViewPage.tsx`** (L93–100)

- The collapsed card is exactly `layerStyle="card"` and the expanded card is exactly
  `layerStyle="cardSelected"` → `<Box layerStyle={isExpanded ? 'cardSelected' : 'card'}>`, removing
  the four explicit `border*` / `bg` / `p` props (and the `line.brandSubtle` literal reference
  added in bolt `023` — now inherited via the layerStyle).

**Tests**

- `src/features/shopping-list/components/ShoppingListPage.test.tsx` — expected to pass unchanged
  (single control instance renders in the base/footer path). Adjust only if a query breaks.
- Plan / Suppressed / Cooking tests assert behaviour/text, not inline card props — expected to
  pass unchanged.

### Dependencies

- Bolt `023` (complete) — `cardSelected` / `card` layerStyles reference `line.brandSubtle`.
- Independent of bolt `024`.

### Acceptance Criteria

- [ ] Phone: lock checkbox + Copy button fully above the 70px tab bar; bottom padding applied once
- [ ] md+: no sticky footer; lock checkbox + Copy button right-aligned in the page header; lock/copy behaviour unchanged
- [ ] `PlanPage` / `SuppressedPage` / `CookingViewPage` use `layerStyle="card"` / `"cardSelected"`; no hand-rolled `borderRadius="card" + p={3}` card definitions remain
- [ ] No `line.brandSubtle` / `#E3E7DA` literal in `CookingViewPage.tsx` (now via the layerStyle)
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green

### Out of Scope

- Shopping-list two-column category flow at md+ (intent `004`)
- Restyling the Copy button or the cards' contents
