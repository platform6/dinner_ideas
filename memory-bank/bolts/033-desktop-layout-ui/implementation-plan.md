---
stage: plan
bolt: 033-desktop-layout-ui
created: 2026-08-28T20:02:00Z
---

## Implementation Plan: desktop-layout-ui — bolt 033 (three md+ screen reshapes)

### Objective

Give Shopping list, This week, and Grocery store setup a real desktop shape at md+. Below md, all
three are unchanged from intent `003`.

### Deliverables

**Story 006 — `StoreConfigPage.tsx`** (simplest, do first)

- Import `SimpleGrid`. Wrap the two `<Box>` sections (Rows, Category assignments) — currently
  direct children of `<Stack gap={6}>` after the `<Heading>` — in
  `<SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>`.
- Category-assignment rows (`<HStack key={category} justify="space-between">`, ~L179) →
  add `layerStyle="card"` so they match the row list.
- Page is capped at 1080px automatically (`/store-config` ∈ `WIDE_ROUTES` from bolt `032`).

**Story 005 — `PlanPage.tsx`**

- Import `SimpleGrid`, `useBreakpointValue`. `const threeAcross = useBreakpointValue({ base: false, md: true }, { ssr: false }) ?? false`.
- Replace the `<Stack gap={2}>` wrapping `selections.map` with
  `<SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 2, md: 3 }}>`.
- Card internals branch on `threeAcross`:
  - **phone** (`false`): the existing horizontal `<HStack layerStyle="cardSelected">` row — unchanged.
  - **md+** (`true`): a vertical card — `<Stack layerStyle="cardSelected" p={3.5} gap={2.5}>`:
    an `<HStack justify="space-between">` with a 28px `borderRadius="full"` `bg="brand.500"`
    numbered badge and the remove `IconButton` (when unlocked); a full-width 76px
    `bg="paper.sunken"` `borderRadius="control"` photo slot; the name at `textStyle="cardTitle"
fontSize="0.9375rem"`; cuisine · cook time at `textStyle="meta"`.
- Empty / all-picked / locked dashed-card states unchanged. Week arrows already in the header.
- Photo slot ships empty (no image field — `003` finding 12 decision).

**Story 004 — `ShoppingListPage.tsx`**

- Import `useBreakpointValue`. `const actionsInHeader = useBreakpointValue({ base: false, md: true }, { ssr: false }) ?? false`.
- Header `HStack`: `{actionsInHeader ? <HStack gap={4} flexShrink={0}>{lockCheckbox}{copyButton}</HStack> : <Center …copy icon… />}`.
- The groups container `<Stack gap={4}>` (wrapping `groups.map`) → `<Box sx={{ columns: { base: 1, md: 2 }, columnGap: '28px' }}>`
  (CSS multi-column needs a block container, not a flex `Stack`); each category `<Box key={group.category}>`
  gets `sx={{ breakInside: 'avoid' }}` and `mb={4}` (gap replacement inside a column layout).
- The end actions `<Box>`: render only `{!actionsInHeader && ( <Box position="sticky" bottom="70px" …> <Stack gap={3}>{lockCheckbox}{copyButton}</Stack> </Box> )}` — the `md` responsive props on it are dropped (base-only now).

### Dependencies

- Bolt `032` (complete) — rail + measure cap + `matchMedia` polyfill / `ChakraProvider` wrapper
  (so `useBreakpointValue` works in tests).

### Technical Approach

- `useBreakpointValue` is used only where a single DOM instance must sit in one of two places
  (shopping-list actions) or render two different internal structures (this-week card). The 2-column
  group flow and the store-setup grid are plain CSS-responsive props.
- jsdom resolves `useBreakpointValue` to `base` → all three screens render their phone layout in
  tests → existing `ShoppingListPage` / `PlanPage` / `StoreConfigPage` suites pass unchanged
  (they assert on text / roles, not layout containers).

### Acceptance Criteria

- [ ] Store setup: two sections side by side at md+, capped 1080px; assignment rows `layerStyle="card"`; stacked below md
- [ ] This week: 3-across `SimpleGrid` at md+ with the card spec; horizontal rows below md; week arrows in the header
- [ ] Shopping list: two CSS columns at md+ (no category split), lock + Copy in the header; `003` sticky bar unchanged below md
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green

### Out of Scope

- Catalog breakpoint move + pointer/hover states (bolt `034`)
- Real photos in the This-week slot
