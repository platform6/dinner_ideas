---
stage: test
bolt: 076-mobile-overlap-fixes
created: '2026-09-17T17:42:54Z'
---

## Test Report: mobile-overlap-fixes

### Summary

- **Tests**: 777/777 passed across 48 files (765 before this bolt; +12, and 2 new test files)
- **Coverage**: not measured; no formal target. Every rule below is pinned by a test shown to fail
  when the rule is broken, except the one wiring gap noted under Issues Found.
- `tsc -b` and `eslint src --max-warnings=0` pass; every changed and new file passes Prettier.

### Test Files

- [x] `src/features/dinners/components/card-menu-offset.test.ts` (new) - a bottom placement opens
      below the whole header block plus the gap, for `bottom`, `bottom-start` and `bottom-end`; a
      flipped `top` placement keeps the normal gap; never closer than the gap when the header ends
      above the button; the gap when either element is unmeasured
- [x] `src/shared/components/StickyPhoneFooter.test.tsx` (new) - sticky above the tab bar;
      scroll padding is tab bar + footer height + clearance (176px for a 98px footer); re-measures
      when its size changes (98px to 52px); measures once where `ResizeObserver` is missing; removes
      the padding on unmount
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` - with Chakra's breakpoint
      queries answered as a real viewport would: at 390px the page reserves bottom scroll padding and
      releases it on unmount; at 1024px, where the actions sit in the header, it sets none
- [x] `src/features/dinners/components/DinnerCard.test.tsx` - the action menu opens from the keyboard
      (Enter), reports `aria-expanded`, closes on Escape, and returns focus to its button. The
      existing tests still cover choosing "Not interested" and "Remove…" from it.

### Regression proof

Each rule was broken on purpose, then restored:

- **Footer padding never removed**: 2 tests failed (component unmount; page leaving).
- **Menu offset ignores the header**: 1 test failed (the bottom-placement rule).
- **Shopping list uses a plain sticky box instead of the footer component**: 1 test failed (the page
  at phone width).

### Browser verification (Stage 2, before the checkpoint)

Local dev server against the household's catalog, signed in by the product owner; no menu item
chosen, no data changed. Recorded in full in `implementation-walkthrough.md`:

- phone, card menu: clears 4- and 7-line titles by opening below them, and flips above the button
  near the bottom of the screen
- 3 columns, card menu: clears a 7-line title both ways
- phone, shopping list: 176px padding; a focused item under the footer is scrolled clear; end of
  list unchanged; padding removed after leaving the page

### Acceptance Criteria Validation

- ✅ **End of the list** fully visible above the footer, and footer above the tab bar (browser, before
  and after the change)
- ✅ **Focusing an item under the footer** scrolls it clear (browser; padding wiring by tests)
- ✅ **Content passing beneath the footer mid-scroll** is unchanged (no change to the sticky behaviour)
- ✅ **md+ sets no scroll padding** (test)
- ✅ **A wrapped title is not covered** at phone width (browser; rule by tests)
- ✅ **The flipped menu near the bottom** doesn't cover the title (browser; rule by tests)
- ✅ **3 columns** doesn't cover the title (browser)
- ✅ **Keyboard operable**: opens from Enter, closes on Escape, focus returns, actions still work
  (tests)
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

- **Wiring gap in unit tests**: if `DinnerCard` stopped passing the offset modifier to its `Menu`,
  no unit test would fail. jsdom has no layout, so the header and button both measure 0 and the
  distance falls back to the normal gap either way. The browser check is what proves the wiring.
  Worth knowing if `DinnerCard`'s menu is changed later.

### Notes

- The shopping list's page-level test answers Chakra's breakpoint media queries from a chosen
  viewport width, rather than using the global stub that always reports "no match". This keeps
  both the phone and desktop paths testable.
