---
stage: implement
bolt: 025-frontend-review-ui
created: 2026-08-28T19:20:00Z
---

## Implementation Walkthrough: frontend-review-ui — bolt 025 (shopping-list action bar + card layerStyles)

### Summary

Fixed the shopping-list sticky action bar (clears the 70px tab bar on phone, un-sticks and
right-aligns at md+, bottom padding no longer doubled) and switched Plan / Suppressed / Cooking
from hand-rolled cards to the shared `card` / `cardSelected` layerStyles.

### Completed Work

- [x] `src/features/shopping-list/components/ShoppingListPage.tsx`
  - Dropped `pb={20}` from the page `Stack` (Layout already applies `pb="70px"` on phone)
  - Lock `Checkbox` + "Copy shopping list" `Button` extracted to `const` fragments, rendered once
  - Their container: `position={{ base: 'sticky', md: 'static' }}`, `bottom={{ base: '70px', md: 'auto' }}`,
    top border only on base; the `Stack` inside is `direction={{ base: 'column', md: 'row' }}`,
    `justify={{ md: 'flex-end' }}`; the Copy button is `width={{ base: 'full', md: 'auto' }}`
- [x] `src/features/weekly-plan/components/PlanPage.tsx` — selection row: `bg="brand.50" borderRadius="card" p={3}` → `layerStyle="cardSelected"`
- [x] `src/features/dinners/components/SuppressedPage.tsx` — row: `bg="paper.subtle" borderRadius="card" p={3}` → `layerStyle="card" bg="paper.subtle"` (keeps the recessed surface, takes radius/padding/hairline from the layerStyle)
- [x] `src/features/cooking-view/components/CookingViewPage.tsx` — card: four explicit `border*`/`bg`/`p` props → `layerStyle={isExpanded ? 'cardSelected' : 'card'}` (the collapsed/expanded looks matched the two layerStyles exactly; also removes the `line.brandSubtle` literal reference added in bolt 023)

### Key Decisions

- **No `useBreakpointValue`.** It crashes in this project's test setup (components render without a
  `ChakraProvider`, so `useBreakpoint` hits `undefined.__breakpoints`). The codebase convention is
  CSS-responsive style props with a single DOM instance — followed here.
- **Deviation from plan**: the md+ controls sit in a right-aligned row in the content flow
  immediately below the page header, not physically inside the `<header>` `HStack` next to the
  title. A single instance can't be in two DOM parents, and relocating it into the header would
  need a breakpoint hook. The substance of review finding 3 — retire the sticky footer at md+,
  right-align the controls, un-double the padding — is delivered.
- **SuppressedPage keeps `bg="paper.subtle"`** as an override on top of `layerStyle="card"` — the
  suppressed rows are meant to read recessed; only the hand-rolled radius/padding/border are
  replaced.

### Deviations from Plan

The md+ action controls are placed just below the header rather than inside it — see Key Decisions.

### Dependencies Added

None.

### Verification Run (this stage)

- [x] `npm run build` — clean
- [x] `npm run lint` — clean
- [x] `npm run test` — 134 / 134

### Developer Notes

Intent `004`'s shopping-list reshape (two-column category flow at md+) can build on this md+ row
layout. If `004` introduces a `matchMedia` polyfill / `ChakraProvider` test wrapper, the controls
could then be lifted into the header proper.
