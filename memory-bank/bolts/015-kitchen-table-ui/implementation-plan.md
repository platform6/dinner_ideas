---
stage: plan
bolt: 015-kitchen-table-ui
created: 2026-08-27T10:25:00Z
---

## Implementation Plan: kitchen-table-ui (structural navigation)

### Objective

Land the 3 structural navigation changes: bottom tab bar, filter chips + a dedicated Suppressed route, and moving "Not interested" into a card overflow menu.

### Deliverables

- `src/shared/components/icons.tsx`: extend `uiIcons` with `store: Store` (new store-config nav entry point) and `logOut: LogOut` — the two icons this bolt needs that story `002` didn't anticipate exactly.
- `src/shared/components/Layout.tsx`: bottom tab bar rendering `navItems` (4 tabs), responsive back to a top bar at `md`+; log out moves to a small icon button in the bar/header; `/store-config` gets a header icon-button link (not a tab).
- `src/features/dinners/components/CatalogFilters.tsx`: cuisine `<Select>` + tag `<CheckboxGroup>` → a chip row. Chips are plain Chakra `Button`s (the theme's `Button` baseStyle already sets `borderRadius: 'chip'`, so no new component override is needed) — "All"/cuisine + "Quickest" (cook-time sort) inline, full cuisine list + tag filter behind a `SlidersHorizontal` overflow `Menu`.
- `src/features/dinners/components/CatalogPage.tsx`: remove the `showSuppressed` state/branch and the "Show suppressed" `<Switch>` entirely; add a header icon-button linking to the new `/suppressed` route.
- New `src/features/dinners/components/SuppressedPage.tsx` + route `/suppressed` in `App.tsx`.
- `src/features/dinners/components/DinnerCard.tsx`: drop the `variant`/`onUnsuppress` prop entirely (suppressed dinners no longer render through this component — see note below); add a card overflow `Menu` with "Not interested", calling the existing `useSetDinnerActive({ isActive: false })`.

### Scope note: pulling story `011` forward into this bolt

The handoff's Suppressed-view spec (`011-suppressed-view-restyle`) is a distinctly different row layout from the Catalog card (no photo tile, no pick control, no expandable details — just a 38px `EyeOff` tile + "Bring back" pill). Building a placeholder/stub for the new `/suppressed` route in this bolt and then replacing it with real content in bolt `018` would mean writing throwaway code. Since the actual content is small and already fully specified, this bolt implements story `011`'s real content directly alongside story `004`'s route — bolt `018` will then only cover story `010` (Cooking view). Flagging this now rather than silently deviating from the plan.

### Dependencies

- `014-kitchen-table-ui` (complete): theme + icon vocabulary

### Technical Approach

- `DinnerCard.tsx` currently branches on `variant: 'active' | 'suppressed'` to show either "Not interested" or "Un-suppress". Since suppressed dinners move to their own page with a completely different row design, this branch is removed — `DinnerCard` is now unconditionally the active-catalog card, and the new `SuppressedPage.tsx` gets its own small, simpler row component (not `DinnerCard`).
- `CatalogFilters.tsx`'s `CatalogFilterState` shape (`cuisine`, `tags`, `sortByCookTime`) and `filters.ts`'s filtering logic are both unchanged — only the rendering becomes chips.
- `useSuppressedDinners(enabled)` becomes `useSuppressedDinners()` (always enabled) now that it's its own page, not conditionally rendered — a small hook signature simplification, not a behavior change.

### Acceptance Criteria

Directly from stories `003`, `004`, `005` (see those files for the full Given/When/Then list); summarized:

- [ ] Bottom tab bar with 4 tabs; store-config reachable via header icon-button; log out off the tab bar; responsive back to top bar at `md`+
- [ ] Filter row is chips; full cuisine + tag list behind an overflow menu; `showSuppressed` branch fully removed from `CatalogPage`
- [ ] `/suppressed` route exists and renders real content (pulled forward from story `011`)
- [ ] "Not interested" reachable via card overflow menu, not a persistent button; same underlying mutation
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass; existing suppress/un-suppress test coverage updated to match the new page structure, not just deleted

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?
