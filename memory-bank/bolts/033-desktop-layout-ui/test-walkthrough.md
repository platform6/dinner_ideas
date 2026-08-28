---
stage: test
bolt: 033-desktop-layout-ui
created: 2026-08-28T20:12:00Z
---

## Test Report: desktop-layout-ui — bolt 033 (three md+ screen reshapes)

### Summary

- **Tests**: 134 / 134 passed (21 files)
- **Build**: `tsc -b && vite build` clean
- **Lint**: `eslint .` clean

### Test Files

- [x] `PlanPage.test.tsx` (7) — `renderPage` now wraps in `<ChakraProvider>`; assertions unchanged
      (text `Tacos`/`Pasta`, remove-by-aria-label, week nav) — all green in the phone (base) layout
- [x] `ShoppingListPage.test.tsx` (7) — same `<ChakraProvider>` wrap; copy / lock / clipboard-fallback
      flows green; lock checkbox + Copy button still found once (base → sticky-footer path)
- [x] `StoreConfigPage.test.tsx` (6) — no test change needed (`SimpleGrid` + `layerStyle` are layout
      only); green
- [x] remaining 18 suites — unchanged, green

### Acceptance Criteria Validation

- ✅ **Store setup: two sections side by side at md+, capped 1080px; assignment rows `layerStyle="card"`;
  stacked below md** — `SimpleGrid columns={{ base: 1, md: 2 }}`; `/store-config` ∈ `WIDE_ROUTES`
- ✅ **This week: 3-across `SimpleGrid` at md+ with the card spec; horizontal rows below md; week
  arrows in the header** — `columns={{ base: 1, md: 3 }}`; `threeAcross` branch renders the
  vertical card (badge / 76px slot / name / meta)
- ✅ **Shopping list: two CSS columns at md+ (no category split), lock + Copy in the header; `003`
  sticky bar unchanged below md** — `sx={{ columns: { md: 2 } }}` + `breakInside: 'avoid'`;
  `actionsInHeader` gates the header vs footer render
- ✅ **build / lint / full suite green**

### Issues Found

None.

### Notes

The md+ layouts are not exercised in jsdom (`useBreakpointValue` → `base`). A browser pass across
the three screens at ≥768px is a reasonable pre-release check. Two test files gained a
`ChakraProvider` wrapper — the general fix for testing any component that now reads a breakpoint.
