---
stage: implement
bolt: 058-shopping-list-move
created: '2026-09-07T00:45:00Z'
---

## Implementation Walkthrough: 003-shopping-list-move

### Summary

Added a per-item move affordance to the shopping list that opens unit 002's `AssignSheet`
unmodified. The sheet, the suggestion engine, the writes and the re-sort are all existing code —
this bolt contributes an entry point, an identity lookup between an aggregated line and its registry
item, and scroll anchoring so a re-sort does not slide a part-checked list out from under the reader.

No new files, no new dependencies, no schema or API change.

### Structure Overview

The shopping list already read the same resolution view the store page does, and `usePlaceItem`
already invalidated it. So the re-sort needed no new machinery: a successful placement invalidates
the resolution query, `resolved.data` changes, the existing `useMemo` recomputes, and
`reorderGroupsByLocation` returns the new order. The feature is mostly wiring that was waiting to be
connected.

The one genuinely new piece of thinking is the row. A shopping-list line was a Chakra `Checkbox`
whose label filled the row; a move button placed inside it would have sat within the `<label>` and
toggled the check on its way through. The checkbox and the move control are now siblings in a flex
row with the checkbox holding `flex={1}` — which removes the conflict structurally instead of
suppressing the event.

### Completed Work

- [x] `src/features/shopping-list/reorder.ts` - exports the previously private `nameKey` helper so
      the move lookup and the sort share one definition of item identity
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` - the move affordance, the assign
      sheet wiring, failure reporting, and the scroll anchor

### Key Decisions

- **`AssignSheet` reused verbatim, from its existing folder.** It takes a `ResolvedItem` plus
  callbacks and holds no store-page state, so it was already shared in everything but location.
  Relocating it to `shared/` would have touched unit 002's files and its 325-line suite for no
  behavioural gain.

- **Identity comes from the exported `nameKey`, not a local copy.** The aggregated line carries no
  id, so it has to be matched to the registry by `lower(btrim(name))` — the same rule as
  `items.name_key`. `reorder.ts` warns that a drifting copy silently stops matching; a second copy in
  a second file is that same bug with more places to look for it.

- **Category-placement hooks are not imported into this feature.** From the shopping list a move
  means "this thing is here", never "everything like it is here". Leaving
  `useSetCategoryPlacement` unreachable from the file enforces that, where a comment would only
  request it.

- **Checkbox and move button as siblings.** Preserves the full-width-minus-one-button tap target for
  checking off, and avoids nested interactive elements entirely.

- **The affordance renders only with a store, at least one stop, and a registry match.** With
  nowhere to move something, a move control is a promise the page cannot keep.

- **Scroll anchored on the moved row.** The user tapped it, so it is what they are looking at. Its
  viewport offset is recorded at the moment of the write and the page scrolls by whatever it drifted
  after the new order paints. The effect keys on `groups` identity rather than the order alone, so a
  move that does not reorder still clears the anchor — a stale one would misapply itself to an
  unrelated re-sort later.

- **No optimistic update anywhere.** The list renders from refetched server state only, which is what
  makes "the list is unchanged on failure" true by construction rather than by intention.

### Deviations from Plan

**One, in failure handling.** The plan said a failed write would leave the sheet open with an inline
message. `AssignSheet` has no error slot, and the plan also committed to not modifying it — those two
turned out to be incompatible.

Resolved by closing the sheet and showing a dismissible error on the page. The sheet is a bottom
drawer with an overlay, so a message rendered underneath it would have been a message nobody reads;
adding an error prop would have meant touching unit 002's component and suite. Closing with a clear,
dismissible message satisfies the story's actual criterion — the move fails **visibly** and the list
is unchanged — without either compromise.

Everything else went as planned.

### Dependencies Added

None.

### Developer Notes

- `checkedItems` survives a re-sort because its keys are `category-name-unit` and a move changes
  none of those three. That is a property of the existing key choice, not of this bolt — Stage 3
  pins it so a future key change cannot quietly break it.
- The scroll anchor cannot be meaningfully unit-tested: jsdom reports every `getBoundingClientRect`
  as zero, so an assertion would pass regardless of whether the logic worked. It is verified
  manually in Stage 3 and reported as manual.
- `tsc -b` clean, `eslint` clean, and the full suite is green at 305/305 with **no test file
  modified** — the cut criterion's letter. Its spirit is Stage 3's job, because the existing suite
  mocks the store away and so never renders the affordance at all.
