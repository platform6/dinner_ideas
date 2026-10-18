---
stage: plan
bolt: 082-empty-aisle-toggle
created: '2026-10-18T19:40:54Z'
---

## Implementation Plan: empty-aisle-toggle

### Objective

Store setup's walking path shows the aisles the household uses. Empty ones sit behind a "Show N
empty aisles" toggle: hidden, not deleted.

### What the code shows

- **`StoreConfigPage.tsx:208`** maps every stop to a `LocationRow`, with `isFirst`/`isLast` from
  the index in the full list.
- **"Empty" is already computable.** `itemsByLocation` groups every item by the stop it resolves
  to, inherited ones included, so an aisle with a category on it normally has items. An aisle can
  hold a category that has no items yet, which `categoriesByLocation` covers. Empty means **no
  entry in either map**.
- **`move(index, direction)`** passes the neighbour's `position` to `reorder_location`, and
  announces "{name} moved to position {n}".
- **`reorder_location`** moves a stop to the target position and shifts every stop between
  (migration `20260904180000`). Its comment says it's correct at any distance. So targeting the
  previous _visible_ stop's position puts the mover just before it, and any hidden stops in
  between shift to after it. Moving later works the same way in the other direction. No schema
  change (NFR-1).
- **`addLocation`** returns the new `Location`, so the page can note its id from `onSuccess`.
- **Existing tests stay valid.** The fixture's "Aisle 3" has no items but holds the Protein
  category, so it isn't empty by this definition and stays shown, "Nothing here yet" included.

### Deliverables

1. **`StoreConfigPage.tsx`**:
   - `isEmpty(stop)`: no items and no category at it.
   - Local state `showEmpty` (starts `false` each visit, not persisted) and a set of stop ids
     kept visible this visit (see the decision below).
   - `visibleStops`: every stop when `showEmpty`, otherwise the non-empty and kept ones, in path
     order.
   - Rows map over `visibleStops`. `isFirst`/`isLast` and the move neighbour come from the
     visible list.
   - The announcement counts in the list as shown ("moved to position 2" means second on screen).
     With nothing hidden, that's the same number as today.
   - The toggle sits after the last row, before "Add an aisle or section": "Show 3 empty aisles"
     or "Show 1 empty aisle"; when they're revealed, "Hide empty aisles". It isn't rendered when
     N is 0. It's a Chakra `Button` (`sm`, so 44px on a phone, as intent 024 requires) with
     `aria-expanded`.
   - New stops still append at `stops.length + 1`, counting hidden ones.
2. **Unchanged**: `LocationRow`, `AssignSheet` (still every aisle), `CategoryPlacementSection`,
   the shopping list.
3. **Tests** (Stage 3), in `StoreConfigPage.test.tsx`, a new "empty aisles" block with its own
   fixture (one stop with nothing at all):
   - hidden by default; a category-only aisle shown
   - toggle label and count, singular and plural; absent when N is 0
   - revealing puts them back in path order; "Hide" hides them again
   - a fresh render starts hidden again
   - an aisle added this visit stays visible while empty
   - "move earlier" past a hidden aisle calls `reorder_location` with the previous visible
     stop's position; same for "move later"; `isFirst`/`isLast` follow the visible list
   - with the toggle on, rename, reorder and remove act on the hidden-by-default aisle
   - the "Where do you find it" sheet still lists every aisle

### Dependencies

- None (the story has none). No package, no schema change.

### Technical Approach

- **All on the page.** `LocationRow` already takes `isFirst`/`isLast` and callbacks, so it needs no
  change. The filtering stays next to `itemsByLocation`, where the data already is.
- **`move` takes the visible list.** It gets the stop and its visible neighbour, not an index
  into `stops`. With the toggle on, the visible list is the full path, so behaviour is exactly as
  today.

### ⚠️ Your call at this checkpoint: an aisle that empties during the visit

The story covers an aisle _added_ during the visit (it stays visible). It says nothing about one
that **becomes** empty, for example when you move its last grocery or its only category elsewhere.

- **A (recommended): it stays visible until the next visit.** The page remembers, for this visit,
  every stop that has held something and every stop it added. A row never vanishes under your
  finger right after you act on it; next visit, it's tucked away. (Revealing the empties and then
  hiding them again doesn't count as "held something", so they do hide again.)
- **B: it hides at once.** Simpler, but the row you were just working on disappears, and the
  toggle count jumps.

I've planned for A. It uses the same "kept this visit" set that a newly added aisle needs anyway.

### Acceptance Criteria

- [ ] An aisle with no items and no category is hidden by default
- [ ] An aisle holding only a category is shown
- [ ] "Show N empty aisles" at the end of the path reveals them in their normal position; absent at N = 0
- [ ] The toggle starts hidden on each visit
- [ ] An aisle added this visit stays visible while it's empty
- [ ] "Move earlier" on a visible aisle lands before the previous _visible_ aisle, not swapped with a hidden one (and "move later" the same way)
- [ ] With the toggle on, rename, reorder and delete work as today
- [ ] The "Where do you find it" sheet still lists every aisle
- [ ] The toggle is 44px tall on a phone
- [ ] Existing `StoreConfigPage` tests pass unchanged
- [ ] Browser: the household's store at phone width, read-only. Count the hidden aisles and use the toggle; no reorder on real data
