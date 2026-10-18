---
stage: plan
bolt: 081-merged-line-aisle
created: '2026-09-24T18:24:05Z'
---

## Implementation Plan: merged-line-aisle

### Objective

A merged line keeps the aisle the household gave any of its variants, and the aisle sheet and check
marks work on it.

### What the code shows

Two places answer "which registry item is this line?", both with `nameKey(line.name)`:

1. **`reorder.ts:50`** (`reorderGroupsByLocation`): a group sorts to the earliest position among its
   lines' items
2. **`ShoppingListPage.tsx:336`**: `itemByNameKey.get(nameKey(item.name))` decides whether the row
   gets a "Move {name}" button, and which item the aisle sheet opens for

Since bolt 080, `line.name` is the plain label ("chicken breast"). The household's catalog has
"chicken breast" in six spellings and "onion" in four, each its own registry item with its own
placement. Only the item spelled exactly like the label is found today.

`ResolvedItem.state` is `'placed' | 'inherited' | 'unassigned'`. **`placed`** is an aisle set
directly on the item, which is what FR-4 rule 2 means.

Check marks are already keyed by category + label (bolt 080), and a move never changes a line's
category or label. So story 002's check-mark criteria should hold with no further change. This bolt
proves that with a merged line instead of assuming it.

### Deliverables

1. **`reorder.ts`**: a new exported `lineItem(line, itemsByNameKey)` that applies FR-4:
   1. the item whose `nameKey` equals `nameKey(line.name)`
   2. otherwise, the first of `line.sourceNames` whose item has `state === 'placed'`
   3. otherwise, the first of `line.sourceNames` that has an item at all
   4. otherwise, `undefined` (a line with no registry item at all, as today)

   Plus `indexByNameKey(resolvedItems)` to build the map once.

2. **`reorderGroupsByLocation`** uses `lineItem` for each line's position.
3. **`ShoppingListPage`** uses the same `lineItem` for the Move button and the sheet, in place of
   `itemByNameKey.get(nameKey(item.name))`.
4. **Tests** (Stage 3): the FR-4 rules in `reorder.test.ts`, including the deliberate rule-1 case;
   and on the page, a merged line sorting into its variant's aisle, opening that variant's sheet,
   re-sorting after a move, and keeping its check mark.

### Dependencies

- **Bolt 080** (complete): lines carry `sourceNames`.
- No new package, no schema change (NFR-1). `nameKey` stays identical to `items.name_key`.

### Technical Approach

- **One function, two callers.** The unit brief said "resolve once when the list is built and carry
  it on the line". Building the list (`aggregate.ts`) doesn't have the registry, and adding it
  there would couple a pure merge to server data. Instead, both callers go through `lineItem`, so
  the rule is written once. Both already run inside the same `useMemo` inputs, so the cost is
  negligible at household scale.
- **Stable after a move.** Moving a line places the item `lineItem` chose. That item stays chosen
  afterwards: under rule 1 it's still the exact name; under rule 2 it's still the first placed
  source; under rule 3 it becomes placed, and it's the first source, so rule 2 picks it. A test
  covers the rule-3 path, because a line that jumped to another variant after a move would look
  like the move failed.
- **What the sheet shows.** The sheet is titled with the registry item's own name, so a merged
  "chicken breast" line may open "Where do you find it: chicken breast, cubed". That's accurate:
  it's the item being moved, and the other spellings keep their own aisles. It's worth your call at
  this checkpoint (see below).

### Acceptance Criteria

- [ ] Exact plain-name item wins when it exists (story 001, rule 1)
- [ ] Otherwise the first placed source wins (story 001, rule 2)
- [ ] Otherwise the first source with an item (story 001, rule 3)
- [ ] "chicken thighs, cubed" in Aisle 4, no "chicken thighs" item → the merged line sorts into Aisle 4
- [ ] Both exist, only the variant placed → the exact name wins, and the test says so
- [ ] An unmerged line resolves exactly as before (existing `reorder.test.ts` passes unchanged)
- [ ] Tapping a merged line's Move button opens the sheet for the chosen item (story 002)
- [ ] A move re-sorts the merged line, and the same item stays chosen afterwards (story 002)
- [ ] A checked merged line stays checked across the move and a rebuild (story 002)
- [ ] `nameKey` still matches `items.name_key` (existing test)
- [ ] Browser: in the signed-in app, merged catalog lines resolve to an item. Read-only, as in 080
