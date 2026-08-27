---
stage: test
bolt: 015-kitchen-table-ui
created: 2026-08-27T11:10:00Z
---

## Test Report: kitchen-table-ui (structural navigation)

### Summary

- **Tests**: 117/117 passed (20 test files — 2 new: `SuppressedPage.test.tsx`, `Layout.test.tsx`)
- **Build**: `npx tsc -b` clean, `npx eslint .` clean, `npx vite build` succeeds
- **Live verification**: not possible this bolt — every screen touched is behind Supabase Auth login, and no test/dev credentials are available to this session. Verified via semantic (role/attribute-based) component tests instead.

### Test Files

- [x] `src/shared/components/Layout.test.tsx` (new) — all 4 tabs render, active tab gets `aria-current="page"`, store-config/log-out are header actions (not in the tab bar), log out calls `signOut`
- [x] `src/features/dinners/components/SuppressedPage.test.tsx` (new) — lists suppressed dinners, "Bring back" calls `useSetDinnerActive({isActive: true})`, empty state, live "N still in the catalog" count
- [x] `src/features/dinners/components/CatalogPage.test.tsx` (rewritten suppress-flow tests) — suppress via the card overflow menu (not a persistent button), header link to `/suppressed` (not a toggle switch)
- [x] `src/features/dinners/components/DinnerCard.test.tsx` (+2 tests) — overflow menu is not a persistent "Not interested" button; clicking it calls `onSuppress`
- [x] Remaining 16 pre-existing files — re-verified passing

### Acceptance Criteria Validation

**Story 003-bottom-tab-bar-navigation**

- ✅ 4 icon+label tabs, active tab distinguished — `Layout.test.tsx`
- ✅ Store-config reachable via header icon-button, not a 5th tab — `Layout.test.tsx` ("exposes store-config and log-out header actions, not in the tab bar")
- ✅ Log out off the tab bar — same test

**Story 004-filter-chips-suppressed-route**

- ✅ Chip row replaces `<Select>`/`<CheckboxGroup>`; full lists behind an overflow menu — implemented in `CatalogFilters.tsx` (existing `filters.test.ts` coverage of the underlying logic is untouched, since only rendering changed)
- ✅ `showSuppressed` branch fully removed from `CatalogPage` — confirmed by inspection; `CatalogPage.test.tsx`'s new test asserts the Switch is gone and a route link exists instead

**Story 005-suppress-off-card-face**

- ✅ Not a persistent button; reachable via overflow menu; same underlying mutation — `DinnerCard.test.tsx`, `CatalogPage.test.tsx`

**Story 011-suppressed-view-restyle** (pulled forward)

- ✅ Title, subtitle, `paper.subtle` rows, "Bring back" pill, dashed end-of-list card with live count — `SuppressedPage.test.tsx`

### Issues Found

Two, both fixed:

1. jsdom doesn't implement `Element.prototype.scrollTo`/`scrollIntoView`, which Chakra's `Menu` calls on open — surfaced as an uncaught error the moment this bolt added the first `Menu` component to the codebase. Fixed with a two-line polyfill in `src/test/setup.ts`.
2. My first pass at the active-tab test asserted a raw CSS color via `toHaveStyle`, which jsdom doesn't reliably resolve for Chakra's CSS-custom-property-based color props. Switched to asserting `aria-current="page"` instead — more robust, and better accessibility practice regardless.

### Notes

Live visual verification (screenshot) wasn't possible this bolt, unlike bolt `014` — every affected screen requires being logged in, and this session has no test credentials. If a way to visually confirm the nav/chips/menu in a real browser becomes available (e.g. a household member available to log in, or test credentials provisioned), it would be worth a quick pass before the whole intent ships.
