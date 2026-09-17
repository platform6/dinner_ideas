---
stage: test
bolt: 075-expanded-card-layout
created: '2026-09-17T16:50:38Z'
---

## Test Report: expanded-card-layout

### Summary

- **Tests**: 765/765 passed across 46 files (761 before this bolt; +4)
- **Coverage**: not measured; no formal target. The span is pinned by tests shown to fail in both
  directions, and the layout was checked in a real browser.
- `tsc -b` and `eslint src --max-warnings=0` pass; every changed file passes Prettier.

### Test Files

- [x] `src/features/dinners/components/DinnerCard.test.tsx` - closed: no span and
      `aria-expanded="false"`; open: spans every column and `aria-expanded="true"`; closing removes
      the span; the same toggle element keeps focus through open (click) and close (Enter)
- [x] `src/features/dinners/components/CatalogPage.test.tsx` - with three dinners in the grid: opening
      one spans only that card; two can be open at once; closing one leaves the other; each card
      keeps its position among the grid's children throughout

### How the span is asserted

jsdom does apply Emotion's stylesheet, but Emotion writes `1 / -1` as `1/-1`, and an unset span
computes to an empty string. The tests compare the computed `grid-column`, spaces removed, so the
"closed" assertions are real ones. A first draft used `not.toHaveStyle`, which would have passed
even if the style were never applied. The catalog test finds cards by name, because the catalog
sorts: the first draft assumed input order and failed for that reason, not because of a bug.

### Regression proof

- **Never span** (the span removed): 2 tests failed, the card span test and the catalog test.
- **Always span** (the span applied while closed too): 3 tests failed, including both "closed"
  assertions.

The source was restored after each run.

### Browser verification

Ran `vite` locally against the household's Supabase project, signed in by the product owner. I
entered no credentials. The catalog showed 51 dinners. Only Details toggles were used: no picks,
no data changed. The browser window stayed maximized at 2048 CSS px, so 2 and 1 columns were checked
in a same-origin frame of fixed width inside the page. Media queries follow the frame's width, and
the frame shared the signed-in session.

- **3 columns** (full window, grid 1080px): opening the 2nd card of row 1 made it 1080px wide on its
  own row; the 1st card kept row 1 with two empty cells, as accepted at Checkpoint 1; cards 3–5
  moved below; DOM order 0–4 unchanged. Closing it returned it to 349px at its original position.
- **2 columns** (frame 895px, grid 576px): opening the 2nd card, not first in its row, spanned 576px
  with cards 2–4 below; also opening the 3rd, first in its row, gave two full-row cards, each on its
  own row; DOM order unchanged.
- **1 column** (frame 395px, below `sm`): open and closed cards were both 348px, the grid had one
  column, and the phone tab bar showed; no visible change. Focus stayed on the Details toggle
  through a click.

Screenshots were captured at 3, 2 and 1 columns. The dev server and the probe frame were removed
afterwards.

### Acceptance Criteria Validation

- ✅ **At 2 and 3 columns an expanded card spans the full row**, and later cards continue below
  (browser and tests)
- ✅ **Collapsing returns the card to one column** (browser at 3 columns; tests)
- ✅ **Order never changes and nothing backfills**; the row the card left keeps an empty cell
  (browser at 3 and 2 columns; test)
- ✅ **At 1 column nothing visibly changes** (browser)
- ✅ **Focus stays on the Details toggle** (test; browser at 1 column)
- ✅ **Several cards can be open at once**, each on its own row (browser at 2 columns; test)
- ✅ **The toggle reports `aria-expanded`** (tests; read in the browser)
- ✅ **Seen in a real browser at 1, 2 and 3 columns**
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

None in this bolt's scope.

### Notes

- At 3 columns the expanded card's ingredient and step lists run to 1080px wide. They were readable
  in the screenshot, but lines are long. Content width inside Details isn't in FR-4; it's a
  candidate for intent 020 (visual hierarchy) if it bothers anyone.
- A card left alone in a row with empty cells is the accepted trade-off for never reordering. It's
  visible at 3 columns when a middle card is opened.
