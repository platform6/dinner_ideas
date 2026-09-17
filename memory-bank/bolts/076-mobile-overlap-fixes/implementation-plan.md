---
stage: plan
bolt: 076-mobile-overlap-fixes
created: '2026-09-17T17:03:10Z'
---

## Implementation Plan: mobile-overlap-fixes

### Objective

On a phone, the shopping list's sticky footer never keeps a focused item hidden, and a catalog
card's "More actions" menu never covers the dinner's name, at any width.

### Reproduced first (as the bolt required)

Ran the app locally against the household's catalog (product owner signed in), at phone width in a
fixed-width same-origin frame. The frame was removed and the dev server stopped afterwards; no menu
item was chosen and no data changed.

**Shopping list** (386px wide, 27 items; footer 98px tall, holding the copy button and lock nudge):

- **End of the list is already fine.** Scrolled to the bottom, the last item ends at 479px and the
  footer starts at 511px; the footer ends at 609px and the tab bar starts at 610px. The mobile shell
  already pads for the 70px tab bar, and the footer is `position: sticky`, so it reserves its own
  place in the flow. Nothing to fix here.
- **Focus is a real bug.** Focusing an item's "Move …" button while it sat under the footer left it
  covered: the page didn't scroll, because the browser doesn't know about the footer.
- **The fix is proven.** Setting `scroll-padding-bottom` on the document to tab bar + footer + 8px
  (176px) and focusing the same button scrolled the page 310px and left the button clear of the
  footer. The test style was removed.

**Catalog card menu** (phone width): opening "More actions" on "Greek Chickpea Rice with Cucumber
Tomato Salad", a six-line title, put the menu over its second and third lines. Screenshot:
`claude-chrome-screenshots-8LO9Gg/screenshot-1789664530795-3.png`. The button sits at the top right
of the same header row as the title, and a 224px menu dropping from its right edge lands on any
wrapped title. The desktop screenshots in bolt 075 show 3–4 line titles at 3 columns, so this isn't
phone-only.

### Deliverables

1. **Shopping list footer** (`ShoppingListPage.tsx`)
   - While the phone footer is mounted, set `scroll-padding-bottom` on `<html>` to the tab bar
     height + the footer's measured height + 8px. Remove it on unmount, and when the footer moves
     to the header at md+.
   - Measure with a `ResizeObserver`, because the footer's height changes (the lock nudge comes and
     goes). Guard for environments without it (jsdom), falling back to one measurement.
   - Export the tab bar height from `Layout.tsx` instead of repeating `70px`. Its value is unchanged,
     and the footer's existing `bottom="70px"` uses the same constant.
2. **Card action menu** (`DinnerCard.tsx`)
   - Keep the `Menu` and its `bottom-end` placement, at every width. Give it a Popper `offset`
     modifier whose distance is computed when the menu is positioned: from the button's bottom to
     the bottom of the card's header block (icon, title and meta), plus a small gap. The menu then
     starts just below the title block, however many lines the title wraps to.
   - When Popper flips the menu above the button (near the bottom of the screen), use the normal
     small gap. Above the button, the menu can't reach the title, which is at or below the button's
     top.
   - Chakra appends custom modifiers after its own internal `offset` "to allow users override
     internal modifiers" (`@chakra-ui/react/dist/esm/popper/use-popper.mjs`), so this uses the
     documented `modifiers` prop rather than a workaround.
3. **Tests** (Stage 3)
   - `ShoppingListPage.test.tsx`: at phone width the document gets a `scroll-padding-bottom` that
     includes the tab bar; it's removed on unmount; it isn't set when actions sit in the header.
   - The menu's offset function, tested directly: for `bottom-*` placements it returns a distance
     that clears the header, and for `top-*` the small gap.
   - `DinnerCard.test.tsx`: the menu still opens, closes on Escape, and runs its actions.
4. **Verified in a browser**:
   - phone width: a focused item under the footer is scrolled clear;
   - a long-title card's menu clears the title, including one near the bottom of the screen where
     the menu flips;
   - 3 columns: same check.

### Dependencies

- None added. `ResizeObserver` is a browser API; `@popperjs/core` is already inside Chakra's `Menu`.
- No schema or data changes.

### Technical Approach

- **Why scroll padding, not bottom padding**: the end of the list is already clear. Padding would
  only move the list, while `scroll-padding-bottom` is exactly what tells the browser, when it
  scrolls to focused content, that the bottom strip is covered. It is proven above in Chrome.
- **Why on `<html>`**: the page scrolls on the document, not an inner container.
- **Why not a bottom sheet for the menu on phones**: it would fix the phone, but the same overlap
  exists at 3 columns, it changes how the menu works, and it adds a second implementation of the
  same two actions. Measuring the header keeps one menu that clears the title everywhere.
- **Fallback**: if the Popper offset doesn't behave in the browser, I'll stop at the Stage 2
  checkpoint and bring the bottom-sheet option back to you rather than switch silently.

### Acceptance Criteria

- [ ] At phone width, scrolled to the end, the last item and its move button are fully visible above
      the footer, and the footer is above the tab bar (confirmed already; re-checked after the change)
- [ ] At phone width, focusing an item under the footer scrolls it into view above the footer
- [ ] Content passing beneath the footer mid-scroll is unchanged (expected behaviour)
- [ ] At md+ the shopping list sets no scroll padding and is otherwise unchanged
- [ ] At phone width, "More actions" on a card with a wrapped title leaves the whole title uncovered
- [ ] Near the bottom of the viewport, the flipped menu still doesn't cover the title
- [ ] At 3 columns, the menu doesn't cover the title
- [ ] The menu stays keyboard operable, closes on Escape and on selecting an action
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
