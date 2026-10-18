---
stage: implement
bolt: 082-empty-aisle-toggle
created: '2026-10-18T19:44:26Z'
---

## Implementation Walkthrough: empty-aisle-toggle

### Summary

The walking path hides aisles with nothing at them behind a "Show N empty aisles" toggle at the end
of the path. Moving an aisle steps past the neighbour on screen, so a hidden aisle is never the
thing it swaps with.

### Structure Overview

Everything is on `StoreConfigPage`, next to `itemsByLocation` and `categoriesByLocation`, which
already said which stops hold something. The page passes `LocationRow` the visible list's ends and
neighbours, so the row itself is unchanged.

### Completed Work

- [x] `src/features/store-config/components/StoreConfigPage.tsx` - Adds:
  - `heldIds`: stops with a grocery or a category at them
  - a "kept this visit" set, holding every stop that has held something plus every stop added this visit
  - `visibleStops`
  - the toggle, a ghost `sm` button with `aria-expanded`, singular and plural
  - `addStop`, used by both the add row and the first-run panel

  Rows, `isFirst`/`isLast`, moves and the announcement now work on the visible list.

### Key Decisions

- **An aisle that empties during a visit stays until the next one**: approved at the plan checkpoint (option A). An effect unions `heldIds` into the kept set, so the set only grows during a visit and starts empty on the next.
- **Nothing hides until the category placements load**: the page doesn't wait for them before rendering. Without this guard, an aisle holding only a category would be hidden for a moment, and the toggle's count would flicker.
- **The first-run panel's "Produce" counts as added**: it's an empty stop. Without that, the household's first stop would vanish the moment it was created.
- **Announced position counts the list as shown**: with nothing hidden, it's the same number as before, and the existing test asserts it unchanged.

### Deviations from Plan

None. Two details weren't in the plan: the loading guard and the first-run case.

### Dependencies Added

None.

### Developer Notes

- With the toggle on, `visibleStops` is the whole path, so rename, reorder and delete run exactly the code they ran before.
- The toggle stays hidden when the count is 0, even if it's on. Deleting the last empty aisle while they're revealed leaves the toggle hidden, and nothing on screen changes.
- `tsc -b` and `eslint` are clean. The existing 94 store-config tests pass unchanged.
