---
stage: test
bolt: 034-desktop-layout-ui
created: 2026-08-28T20:22:00Z
---

## Test Report: desktop-layout-ui — bolt 034 (catalog xl + pointer states)

### Summary

- **Tests**: 134 / 134 passed (21 files)
- **Build**: `tsc -b && vite build` clean
- **Lint**: `eslint .` clean

### Test Files

No test files added or changed.

- [x] `CatalogPage.test.tsx` (8) — grid breakpoint is layout only; green
- [x] `DinnerCard.test.tsx` (7) — `_hover` prop doesn't affect queries; green
- [x] `ShoppingListPage.test.tsx` (7) — item text moved inside the `Checkbox` label;
      `getByText('onion')` and the copy/lock flows still pass
- [x] `CookingViewPage.test.tsx` (6) — `cursor` / `_hover` are style-only; green
- [x] remaining 17 suites — unchanged, green

### Acceptance Criteria Validation

- ✅ **Catalog grid `columns={{ base: 1, sm: 2, xl: 3 }}`; page capped 1080px** — one-line change;
  cap from `WIDE_ROUTES`
- ✅ **`DinnerCard` hover = `line.brand` border, no bg change** — `_hover={{ borderColor: 'line.brand' }}`
  on the root card `Box`
- ✅ **Shopping-list item rows toggle from anywhere on the line, `paper.subtle` hover** — the row is
  a single full-width `Checkbox` with label children
- ✅ **Cooking accordion header: pointer cursor + collapsed-card border shift on hover** —
  `cursor="pointer"` on the header button; `_hover` border on the outer card when `!isExpanded`
- ✅ **build / lint / full suite green**

### Issues Found

None.

### Notes

Hover / cursor behaviour is not exercised in jsdom — a quick pointer pass over the catalog, a
dinner card, a shopping-list row and the cooking accordion in a browser is the sensible
pre-release check. This is the last bolt of intent `005-desktop-layout`.
