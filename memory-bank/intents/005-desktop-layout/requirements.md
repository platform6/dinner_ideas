---
intent: 005-desktop-layout
phase: inception
status: complete
created: '2026-08-28T19:30:00Z'
updated: '2026-08-28T19:30:00Z'
---

# Requirements: Desktop Layout

## Intent Overview

Above 768px the Dinner Ideas app has no navigation at all — the bottom tab bar is `display: none`
at `md` and the header only carries the app name plus two icon buttons, so Catalog / This week /
Shopping list / Cooking are reachable only by typing URLs. This intent adds the desktop layout the
app never had: a persistent left rail (from the same `navItems` as the tab bar), a content-measure
cap, and real desktop shapes for the three screens where extra width buys something — while keeping
`ux-guide.md`'s deliberately low bar ("desktop just needs to remain usable").

**Source**: `Design system for mom-friendly project/design_handoff_desktop_and_review/` — `README.md`
part two, and `Layout.reference.tsx`, a drop-in replacement for `src/shared/components/Layout.tsx`
written against the codebase's actual imports. The desktop wireframes are structural only (column
counts, rail proportions, where controls move); style with the tokens the app already has — no new
colours or type sizes anywhere in the desktop work.

**Depends on** intent `003-frontend-review-remediation` (complete) — needs the corrected ink ramp,
`line.brandSubtle`, and the finding-3 sticky-bar fix in place.

## Business Goals

| Goal                                                       | Success Metric                                                                         | Priority |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| Every route is reachable on a laptop without typing a URL  | A persistent left rail at md+ links all `navItems`, plus Store setup + Log out         | Must     |
| Text lines don't stretch the full width of a 1440px screen | Content capped at 720px (narrow) / 1080px (wide), centred                              | Must     |
| The three screens that earn a desktop shape get one        | Shopping list 2-col, This week 3-across, Store setup side-by-side — all at md+ only    | Should   |
| A pointer gets feedback before it commits                  | Hover affordances on cards, shopping-list rows, and the cooking accordion              | Should   |
| Responsive components are testable                         | `matchMedia` polyfill + a `ChakraProvider` render wrapper; `Layout.test.tsx` rewritten | Must     |

---

## Functional Requirements

### FR-1: Left Rail Navigation at md+ (review blocker 2, finding 11)

- **Description**: Replace `Layout.tsx` with the rail-based shell from `Layout.reference.tsx`. Below
  md: header + fixed bottom tab bar, exactly as today. At md+: a 240px persistent left rail
  (`sticky`, `top=0`, `h=100vh`, `paper.base`, 1px `line.subtle` right border), no header at all.
  The rail reads `navItems`; its head is the app name (`fontFamily="heading"`, `0.9375rem`,
  `ink.900` — quieter than a card title, review finding 11); its foot (top hairline) carries Store
  setup then Log out. Active item: `bg="brand.50"`, `color="brand.500"`; inactive `color="ink.300"`;
  hover `bg="paper.subtle"`, `color="ink.700"`.
- **Acceptance Criteria**:
  - `src/shared/components/Layout.tsx` renders the rail at md+ and the header+tab-bar below md,
    using one shared `navItems` array (tab bar and rail can't drift).
  - Only one nav is rendered at a time (via `useBreakpointValue`) so there is exactly one link per
    route in the DOM.
  - App name renders `fontFamily="heading"`, `0.9375rem`, `ink.700` (phone header) / `ink.900`
    (rail head) — not `textStyle="cardTitle"`.
  - Store setup + Log out are reachable at every breakpoint (header below md, rail foot at md+).
  - `App.tsx` is unchanged (`<Layout><Routes/></Layout>`); `Layout` derives the wide measure from
    the pathname.
- **Priority**: Must

### FR-2: Content Measure Cap (review finding 6)

- **Description**: The main region has padding but no max width. Cap it: 720px for This week,
  Shopping list, Cooking, Store setup, Not interested; 1080px for Catalog and Store setup once it
  goes two-column. Centre with `mx="auto"`. Derived from the pathname via a `WIDE_ROUTES` set
  (`/`, `/store-config`) so `App.tsx` needs no restructure.
- **Acceptance Criteria**:
  - The `<main>` inner wrapper is `maxW={isWide ? '1080px' : '720px'}` `mx="auto"`.
  - `isWide` = `wide` prop ?? `WIDE_ROUTES.has(pathname)`.
  - Below md the cap is inert (padding-only layout unchanged in feel).
- **Priority**: Must

### FR-3: Login Vertical Centring at md+

- **Description**: `LoginForm.tsx` caps itself at `maxW="sm"` but `mt={{ base: 12, md: 24 }}` makes
  it sit low on a laptop. Replace the top margin with vertical centring at md+.
- **Acceptance Criteria**:
  - Below md: current spacing preserved (or very close).
  - md+: the login card is vertically centred in the viewport.
  - No change to fields, copy, or `useAuth` behaviour.
- **Priority**: Should

### FR-4: Shopping List — Two Columns, Header Controls (completes review finding 3)

- **Description**: At md+, flow the category groups into two CSS columns (`sx={{ columns: 2, columnGap: '28px' }}`,
  `breakInside: 'avoid'` per category) so the whole list is visible at once; retire the sticky
  footer and move the lock checkbox + Copy button into the page header as a right-aligned `HStack`
  opposite the title. Below md: unchanged from `003` (sticky bar with the `bottom` fix).
- **Acceptance Criteria**:
  - md+: category groups render in two columns; no category splits across the column break.
  - md+: no sticky footer; lock checkbox + Copy button in the header row, right-aligned; lock/copy
    behaviour unchanged.
  - Below md: the `003` sticky bar (`bottom={{ base: '70px' }}`) is unchanged.
- **Priority**: Should

### FR-5: This Week — Three Across at md+

- **Description**: The pick count is fixed at three. At md+, lay the picks side by side
  (`SimpleGrid columns={{ base: 1, md: 3 }} gap={3}` replacing the current `Stack gap={2}`). Card:
  `bg="brand.50"`, `borderWidth="1px"`, `borderColor="line.brandSubtle"`, `borderRadius="card"`,
  `p={3.5}`; a 28px `borderRadius="full"` `bg="brand.500"` numbered badge top-left, remove button
  top-right; below them a full-width 76px `bg="paper.sunken"` `borderRadius="control"` photo slot,
  then the dinner name at `textStyle="cardTitle"`, then cuisine · cook time at `textStyle="meta"`.
  Below md: the existing horizontal rows are unchanged.
- **Acceptance Criteria**:
  - md+: three cards in a row with the spec above; week arrows stay in the page header.
  - The photo slot ships as the empty `paper.sunken` tile (no image field on the model — same
    decision as `003` finding 12).
  - Below md: existing rows unchanged.
- **Priority**: Should

### FR-6: Grocery Store Setup — Side by Side at md+

- **Description**: The screen is about the relationship between two lists (store rows ↔ category
  assignments). At md+, wrap the two `Box` sections in `SimpleGrid columns={{ base: 1, md: 2 }} gap={8}`,
  cap at 1080px, and give the category-assignment rows the same `layerStyle="card"` the row list
  already uses (they are bare `HStack`s today).
- **Acceptance Criteria**:
  - md+: the two sections sit side by side; page capped at 1080px (via `WIDE_ROUTES`).
  - Category-assignment rows use `layerStyle="card"`.
  - Below md: stacked, unchanged.
- **Priority**: Should

### FR-7: Catalog — Third Column at xl, cap 1080px

- **Description**: The catalog grid is `columns={{ base: 1, sm: 2, lg: 3 }}`. The card was designed
  as a row; a 3-up column at 992px stretches its Pick / Details footer. Move the third column to
  `xl` (1280px): `columns={{ base: 1, sm: 2, xl: 3 }}`. Cap the page at 1080px (via `WIDE_ROUTES`).
- **Acceptance Criteria**:
  - `SimpleGrid` is `columns={{ base: 1, sm: 2, xl: 3 }}`.
  - Catalog page content capped at 1080px.
- **Priority**: Could

### FR-8: Pointer States the Phone Build Never Needed

- **Description**: A pointer expects feedback before it commits. Add: `DinnerCard` `_hover={{ borderColor: 'line.brand' }}`
  (the card is a container of controls, so the border is the signal, not a bg change);
  `ShoppingListPage` — wrap each item row in the checkbox's label so the whole line is clickable,
  then `_hover={{ bg: 'paper.subtle' }}` (helps on phone too); `CookingViewPage` — the accordion
  header (`as="button"`) gets `cursor="pointer"` and a `borderColor` shift on hover. (The global
  focus ring already shipped in `003`.)
- **Acceptance Criteria**:
  - `DinnerCard` shows a `line.brand` border on hover; no bg change.
  - Shopping-list item rows are fully clickable (label wraps the row) and show a `paper.subtle`
    hover.
  - Cooking accordion header shows a pointer cursor and a border shift on hover.
- **Priority**: Could

### FR-9: Responsive-Component Test Infrastructure

- **Description**: jsdom has no `window.matchMedia`, so Chakra's `useBreakpointValue` / `useBreakpoint`
  throw (hit in `003` bolt `025`). Add a `matchMedia` polyfill to `src/test/setup.ts` and a
  `ChakraProvider`-wrapping render helper, so `Layout` (FR-1) and any responsive component are
  testable. Rewrite `Layout.test.tsx` for the rail/tab-bar split — it currently asserts the old
  header/tab-bar structure.
- **Acceptance Criteria**:
  - `src/test/setup.ts` stubs `window.matchMedia` (reports no match → responsive hooks resolve to
    `base`).
  - A shared render helper wraps children in `<ChakraProvider theme={theme}>` (+ existing
    `MemoryRouter` where needed); used by `Layout.test.tsx` at minimum.
  - `Layout.test.tsx` covers: all 4 nav links + page content render once; active-route marking;
    Store setup + Log out reachable and not inside the tab-bar `nav`; `signOut` on click.
  - Full `vitest run` green.
- **Priority**: Must

---

## Non-Functional Requirements

### Compatibility

| Requirement       | Notes                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Breakpoint        | `md` (768px) is the single desktop switch. The only exception is Catalog's 3rd column at `xl` (1280px). No `sm`/`lg` layout variants added. |
| Component library | Chakra UI v2 only; light mode only (`initialColorMode: 'light'`).                                                                           |
| Tokens            | No new colours or type sizes. New spacing constants only (rail 240px, measures 720/1080px, tab bar 70px).                                   |

### Accessibility / UX bar

| Requirement | Target                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Desktop bar | Per `ux-guide.md`: the phone app seated well on a large screen — not a desktop application.                                        |
| Nav         | Rail links ≥ 44px targets; active state has both colour and weight change.                                                         |
| Regression  | Full existing suite green; `Layout.test.tsx` rewritten, other suites unchanged unless a screen's md+ branch needs a new assertion. |

---

## Constraints

- `Layout.reference.tsx` and the README part-two measures are the spec — style with existing
  tokens, add no colours/type sizes.
- `App.tsx` is not restructured — `Layout` derives the wide measure from the pathname.
- Below md, every screen stays exactly as it is after intent `003`.
- Photo slots (This week card) ship as the empty `paper.sunken` tile — no image field on the model
  (same decision as `003` finding 12).

## Out of Scope (README "What to leave out")

- Master-detail split for the catalog (the card's Details expansion already does that job).
- Multi-week calendar (the week arrows are enough).
- A data table for the shopping list.
- Dark mode (theme is explicitly light-only).
- Real dinner photos / an image field on `CatalogDinner`.

## Open Questions

None — `Layout.reference.tsx` + README part two are prescriptive; the two product decisions
(cuisine filter, photos) were settled in intent `003`.
