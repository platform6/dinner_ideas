---
stage: implement
bolt: 075-expanded-card-layout
created: '2026-09-17T16:42:20Z'
---

## Implementation Walkthrough: expanded-card-layout

### Summary

A catalog card now spans the whole grid row while its Details are open, and returns to one column
when they close. The Details toggle reports whether it is open.

### Structure Overview

The card's root box is the catalog grid's item, so it sets its own column span from the expanded
state it already owned. No state moved, no prop was added, and `CatalogPage` is unchanged.

### Completed Work

- [x] `src/features/dinners/components/DinnerCard.tsx` - the root box spans all grid columns while
      Details is open; the Details toggle carries `aria-expanded`

### Key Decisions

- **Span "first to last column" rather than a per-breakpoint count**: it follows whatever column
  count the grid has at that width, so the grid's breakpoints live in one place.
- **No change to grid flow**: without backfill, card order is exactly the list order, which
  Checkpoint 1 preferred over filling the gap a moved card leaves.
- **`aria-expanded` added**: not in the story, but it is the accessible state of a disclosure button,
  and it gives tests a semantic hook instead of a style lookup.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- `tsc -b`, `eslint src/features/dinners` and all 761 tests pass. No existing test depended on the
  toggle's attributes or the card's grid placement.
- The span only means something inside a grid; `DinnerCard` is rendered only by the catalog grid.
