---
stage: plan
bolt: 075-expanded-card-layout
created: '2026-09-17T16:39:46Z'
---

## Implementation Plan: expanded-card-layout

### Objective

When Details is open on a catalog card at 2 or 3 columns, that card spans the full row and later
cards continue below it, so no card sits beside a tall empty space. Order never changes.

### What the code shows

- `CatalogPage.tsx:306` renders `<SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>` and maps
  each dinner straight to `<DinnerCard>`. **The card's root `Box` is the grid item.**
- `isExpanded` is local state in `DinnerCard` (`:234`), and Details renders inside that same root
  `Box` (`:336`).
- `SimpleGrid` uses the default `grid-auto-flow: row`, so it never backfills. An expanded card that
  isn't first in its row moves to the next row and leaves an empty cell. Checkpoint 1 accepted that.
- The Details toggle is a plain `Button` with no `aria-expanded`.
- `DinnerCard` is rendered only by `CatalogPage`.

**Design question from inception: where should the state live?** Nowhere new. Because the card is
the grid item, it can set its own column span from its own `isExpanded`. Lifting state into
`CatalogPage` would add a map of expanded ids and a callback prop for no gain.

### Deliverables

1. **`DinnerCard.tsx`, root `Box`**: `gridColumn="1 / -1"` while expanded, unset otherwise.
   - `1 / -1` spans every column of the grid it sits in, whether 2 or 3, so no breakpoint logic
     repeats the grid's own.
   - At 1 column, spanning all columns is the same as spanning one: no visible change.
   - It's the same DOM node before and after, so nothing remounts and the toggle keeps focus.
2. **`DinnerCard.tsx`, Details toggle**: `aria-expanded={isExpanded}`. It costs one attribute,
   tells screen readers the state, and gives tests a semantic hook instead of a style lookup.
3. **Tests** (Stage 3):
   - `DinnerCard.test.tsx`: collapsed has no full-row span and `aria-expanded="false"`; expanded
     spans `1 / -1` with `aria-expanded="true"`; collapsing removes the span; focus stays on the
     toggle through expand and collapse.
   - `CatalogPage.test.tsx`: with two cards, expanding the first spans only that one, both can be
     open at once, and DOM order is unchanged.
4. **Verified in the running app** at 1, 2 and 3 columns: see below.

### Dependencies

- None. No new packages, data, props or schema. Bolts 073 and 074 touched different parts of these
  files, or different files.

### Technical Approach

- Chakra style prop on the existing root `Box`, conditional on `isExpanded`. No `grid-auto-flow`
  change, so no backfill and no reordering.
- **Reading order** (NFR-3) is the DOM order, which this doesn't touch. Only the column span
  changes.
- **Real-layout verification**: jsdom has no layout engine, so tests can only prove the span is
  applied, not what the page looks like. Stage 3 runs `pnpm dev` and checks the catalog in a
  browser at widths giving 1, 2 and 3 columns (below `sm`, `sm` to below `xl`, and `xl` and up),
  expanding a card that's first in its row and one that isn't. The dev server uses `.env.local`,
  which points at the household's Supabase project, so this needs a signed-in session. If the
  browser isn't signed in, I'll stop and ask rather than enter credentials.

### Acceptance Criteria

- [ ] At 2 and 3 columns, an expanded card spans the full row and later cards continue below it
- [ ] Collapsing returns the card to one column
- [ ] Card order never changes, and no backfill happens; a row the expanded card left may have an
      empty cell
- [ ] At 1 column nothing visibly changes
- [ ] Focus stays on the Details toggle through expand and collapse
- [ ] Several cards can be expanded at once, each on its own row
- [ ] The toggle reports `aria-expanded`
- [ ] Seen in a real browser at 1, 2 and 3 columns
- [ ] `pnpm test`, `tsc -b` and `eslint` pass
