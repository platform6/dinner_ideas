---
stage: implement
bolt: 033-desktop-layout-ui
created: 2026-08-28T20:10:00Z
---

## Implementation Walkthrough: desktop-layout-ui — bolt 033 (three md+ screen reshapes)

### Summary

Shopping list flows into two CSS columns at md+ with the lock + Copy controls in the page header;
This week lays its three picks out as vertical cards (`SimpleGrid`) at md+; Grocery store setup puts
its two sections side by side at md+ and gives the category-assignment rows the shared `card`
layerStyle. All three are unchanged below md.

### Completed Work

- [x] `src/features/store-config/components/StoreConfigPage.tsx` — the two `<Box>` sections wrapped
      in `<SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>`; category-assignment rows now
      `<HStack layerStyle="card">`. (Page cap 1080px comes from `/store-config` ∈ `WIDE_ROUTES`, bolt `032`.)
- [x] `src/features/weekly-plan/components/PlanPage.tsx` — `useBreakpointValue` → `threeAcross`; the
      selections wrapper is `<SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 2, md: 3 }}>`; each
      card branches: phone = the existing horizontal `layerStyle="cardSelected"` `HStack`; md+ = a
      vertical `<Stack layerStyle="cardSelected" p={3.5}>` with a 28px badge + remove button row, a
      76px `paper.sunken` photo slot, name, meta. Badge / name / meta / remove button extracted to
      local `const`s to stay DRY across the two branches.
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` — `useBreakpointValue` →
      `actionsInHeader`; when true the header renders `{lockCheckbox}{copyButton}` and the sticky
      footer `Box` is not rendered; the groups wrapper changed from `<Stack gap={4}>` to
      `<Box sx={{ columns: { base: 1, md: 2 }, columnGap: '28px' }}>` (CSS multi-column needs a block
      container), each category `Box` gets `sx={{ breakInside: 'avoid' }}` + `mb={4}`.
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx`,
      `src/features/shopping-list/components/ShoppingListPage.test.tsx` — their local `renderPage`
      helpers now wrap in `<ChakraProvider theme={theme}>` (needed once the components call
      `useBreakpointValue` — `useBreakpoint` reads `theme.__breakpoints`).

### Key Decisions

- **`useBreakpointValue` only where a single DOM node must move or change structure** (shopping-list
  actions, this-week card internals). The 2-column group flow and the store-setup grid are plain
  CSS-responsive props.
- **Test helpers gained `ChakraProvider` inline** rather than switching wholesale to
  `renderWithProviders` — smallest diff; those files keep their mock-specific `QueryClient` setup.

### Deviations from Plan

None.

### Dependencies Added

None.

### Verification Run (this stage)

- [x] `npm run build` — clean
- [x] `npm run lint` — clean
- [x] `npm run test` — 134 / 134 (2 files gained a `ChakraProvider` wrapper; no assertion changes)

### Developer Notes

jsdom resolves `useBreakpointValue` to `base`, so all three screens render their phone layout under
test; the md+ shapes are browser-verified. The This-week photo slot is the empty `paper.sunken`
tile (no image field on the model).
