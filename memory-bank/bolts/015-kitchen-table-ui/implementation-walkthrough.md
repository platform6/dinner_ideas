---
stage: implement
bolt: 015-kitchen-table-ui
created: 2026-08-27T11:00:00Z
---

## Implementation Walkthrough: kitchen-table-ui (structural navigation)

### Summary

Landed the 3 structural navigation changes: a bottom tab bar, filter chips + a dedicated Suppressed route (with story `011`'s real content pulled forward — see the Stage 1 replan note), and moving "Not interested" into a card overflow menu. Also extended the icon vocabulary with the entries this bolt needed (`storeConfig`, `logOut`, `overflowMenu`).

### Structure Overview

Nav-chrome changes are isolated to `Layout.tsx`. `DinnerCard.tsx` drops its `variant`/`onUnsuppress` branch entirely — suppressed dinners no longer render through it at all, since the Suppressed route now has its own, structurally different row component (`SuppressedPage.tsx`). `CatalogFilters.tsx` is rewritten as a chip row on top of the same unchanged filter state/logic.

### Completed Work

- [x] `src/shared/components/icons.tsx` — added `storeConfig`, `logOut`, `overflowMenu` to `uiIcons`
- [x] `src/shared/components/Layout.tsx` — bottom tab bar (4 tabs, `aria-current="page"` on the active one), header icon-buttons for store-config + log out, responsive back to a header-only layout at `md`+
- [x] `src/features/dinners/components/CatalogFilters.tsx` — cuisine `<Select>` + tag `<CheckboxGroup>` → chip row (`Button`s, whose theme baseStyle already sets `borderRadius: 'chip'`) + an overflow `Menu` for the full cuisine/tag lists
- [x] `src/features/dinners/components/CatalogPage.tsx` — `showSuppressed` state/branch and the "Show suppressed" `<Switch>` removed entirely; header gains a link to `/suppressed`
- [x] `src/features/dinners/components/SuppressedPage.tsx` (new) — the real Suppressed-view content (pulled forward from story `011`)
- [x] `src/features/dinners/components/DinnerCard.tsx` — `variant`/`onUnsuppress` props removed; card overflow `Menu` added with "Not interested"; `selection` prop is now required (every remaining caller always passes one)
- [x] `src/features/dinners/hooks.ts` — `useSuppressedDinners()` no longer takes an `enabled` flag (it's its own page now, not conditionally rendered)
- [x] `src/App.tsx` — new `/suppressed` route
- [x] `src/test/setup.ts` — polyfilled `Element.prototype.scrollTo`/`scrollIntoView` (jsdom doesn't implement them; Chakra's `Menu` calls `scrollTo` on open)
- [x] Updated tests: `CatalogPage.test.tsx` (suppress-flow tests rewritten for the overflow menu + route link, `MemoryRouter` added since `CatalogPage` now renders a `RouterLink`), `DinnerCard.test.tsx` (fixture updated for the new required `selection` prop, +2 tests for the overflow menu)
- [x] New tests: `SuppressedPage.test.tsx`, `Layout.test.tsx`

### Key Decisions

- **Story `011` pulled forward** (see bolt `018`'s updated scope and the construction log's Replanning History) — approved before implementing.
- **`aria-current="page"` for the active tab**, not a raw color assertion in tests — more robust (jsdom's CSS-custom-property resolution via `getComputedStyle`/`toHaveStyle` isn't reliable) and better accessibility practice regardless of testing concerns.
- **`DinnerCard`'s `selection` prop is now required**, not optional — the only remaining caller (`CatalogPage`) always has one to pass, now that suppressed dinners don't route through this component.

### Deviations from Plan

- Pulled story `011` forward (flagged and approved at the Stage 1 checkpoint — not a silent deviation).
- Added the jsdom `scrollTo`/`scrollIntoView` polyfill, not called out in the plan — a genuine test-environment gap surfaced by adding the first Chakra `Menu` to this codebase, not a design change.

### Dependencies Added

None.

### Developer Notes

- Could not visually verify this bolt's screens in a live browser — they're all behind the household's Supabase Auth login, and I don't have (and shouldn't ask for) real credentials. Relying on the semantic, role/attribute-based test coverage instead (117 passing tests) rather than a screenshot this time; see `test-walkthrough.md`.
- Ran `npx tsc -b`, `npx eslint .`, `npx vitest run` (117/117 passing), and `npx vite build` — all clean.
