---
stage: test
bolt: 058-shopping-list-move
created: '2026-09-07T01:15:00Z'
---

## Test Report: 003-shopping-list-move

### Summary

- **Tests**: 317/317 passed (32 files) — 12 added by this bolt
- **`tsc -b`**: clean
- **`eslint src`**: clean
- **`vite build`** (the Netlify command): succeeds, PWA precache regenerated
- **Coverage**: no formal target — per coding standards, effort goes where it is risky to be wrong

### Test Files

- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` - 10 new cases in a
      separate top-level block: the sheet, the writes, the re-sort, check-state survival, failure,
      unplace, the no-path case, checking off with the affordance present, and scroll anchoring
- [x] `src/features/shopping-list/reorder.test.ts` - 2 new cases pinning the now-exported `nameKey`
      at its public edge

### The cut criterion — both halves

**The letter.** Every existing test passes with no test body altered. The one line removed from
the file is an import statement, widened to pull in the newly-referenced mocks:

```
$ git diff -U0 ShoppingListPage.test.tsx | grep '^-' | grep -v '^---'
-import { fetchActiveStore, fetchResolvedItems } from '@/features/store-config/api';
```

That is the complete list of deletions. New cases were appended as a separate `describe` with its
own fixtures and render helper rather than folded into the existing block, so the original evidence
could not be quietly adjusted to accommodate the feature.

**The spirit.** Flagged at Stage 1 and closed here. The existing suite mocks `fetchActiveStore` to
`null`, so the move affordance never renders in any of it — those tests pass because the feature is
absent, not because it was shown harmless. `still checks items off normally with the move affordance
present` configures a real store, renders the affordance on every row, then checks two items off,
unchecks one, and asserts no sheet opened and no write fired. That is the case that actually answers
story 002.

**Verdict: ship, do not cut.** Checking off is unchanged with the affordance present. The row's
primary target lost 44px at its trailing edge and gained no nested interactive element.

### Tests were falsified before being trusted

Passing first time is weak evidence, so three deliberate regressions were introduced and reverted:

| Sabotage                                     | Expected to break    | Result              |
| -------------------------------------------- | -------------------- | ------------------- |
| Dropped `resolved.data` from the sort's deps | re-sort, check-state | ✅ both failed      |
| Replaced the scroll condition with `false`   | scroll anchoring     | ✅ failed           |
| (baseline, reverted)                         | —                    | ✅ 317/317 restored |

Each was reverted and the full suite re-run green.

### Acceptance Criteria Validation

Story 001:

- ✅ **Opens the same `AssignSheet`**: asserts the sheet's own copy, its stop buttons, and its
  resolution line ("following Dairy to Back wall") — the same component, not a lookalike
- ✅ **Re-sorts without a full reload**: order flips from `[onion, cheddar]` to `[cheddar, onion]`
  after the write, driven by query invalidation only
- ✅ **Item placement, never category**: asserts `placeItem` with the item id, and asserts
  `setCategoryPlacement` / `unsetCategoryPlacement` were never called
- ✅ **Marked reviewed**: asserts `markItemReviewed` with the moved item's id
- ✅ **Check state preserved**: an item checked off before the move is still checked after it
- ✅ **"Take it off the path"** offered for an explicitly placed item
- ✅ **Failed write**: error shown, order unchanged, no `markItemReviewed`
- ✅ **Scroll position** — **VERIFIED ON PRODUCTION 2026-09-08**, see the addendum at the end

Story 002:

- ✅ Existing suite passes unmodified
- ✅ New cases cover re-sort, item-placement-only, check-state, failure-leaves-unchanged
- ✅ Checking off verified with a store configured
- ✅ `tsc -b`, `eslint`, `vitest` green

### The one criterion not fully closed by tests

**Scroll position.** jsdom has no layout engine — every `getBoundingClientRect` returns zero — so
the row's position is simulated in the test. What is genuinely verified is the _logic_: measure the
moved row's offset before the write, measure it again after the new order paints, hand the
difference to `scrollBy`. The sabotage run confirms the assertion has teeth.

What is **not** verified is that real browser layout puts the row where the arithmetic expects,
particularly under the `columns: 2` multi-column layout at md+, where reflow is less predictable
than in a single column. No claim is made that it was.

**Outstanding, for a human on a real device**: mid-shop, scroll into a part-checked list, move an
item whose group jumps to the top, and confirm the list does not slide out from under you. Phone
first — that is the use case — then a wide desktop window for the two-column path. Suggested as a
post-deploy check for whichever release carries this unit.

### Issues Found

None. No behaviour changed in unit 002 or on `/store`; that page's 34 tests pass untouched.

### Notes

- The pre-existing `no-explicit-any` warning in `supabase/functions/claude-proxy/anthropic.ts` is
  unrelated to this bolt and was present before it.
- `AssignSheet` was not modified, so unit 002's 325-line suite needed no attention.

---

## Addendum — scroll position verified on production, 2026-09-08

The one criterion this report left open is now closed, on the live site rather than in jsdom.

### Method

Chrome at **500 x 635** — single column (`matchMedia('(min-width: 48em)')` false), page genuinely
scrollable (`scrollHeight` 1344 > viewport 635). Three items checked off part-way down the list,
scrolled to mid-list, then `cod fillet` moved from Protein (path position 7) to Produce (position
1), which forces its PROTEIN group from 5th to 2nd.

### Result

| Measure       | Before                                  | After                                   | Delta     |
| ------------- | --------------------------------------- | --------------------------------------- | --------- |
| `scrollY`     | 709                                     | 110                                     | **-599**  |
| `codRowTop`   | 338                                     | 338                                     | **0**     |
| Group order   | PRODUCE, DAIRY, PANTRY, GRAINS, PROTEIN | PRODUCE, PROTEIN, DAIRY, PANTRY, GRAINS | reordered |
| Checked items | 3                                       | 3                                       | preserved |

**Zero drift.** The moved row travelled 599px up the document and stayed at exactly the same pixel
in the viewport. The `useLayoutEffect` anchor compensated precisely under real browser reflow.

### An unexpected finding at desktop width

At 1920px the check is **not applicable**: `scrollHeight` equals the viewport, because the
two-column layout fits all 17 items on screen. There is no scroll position to preserve and
`scrollBy` is a no-op.

So the two-column reflow risk flagged in the technical design is moot at this list size. It could
still apply to a list long enough to scroll at desktop width; that case remains unverified, and is
a much less likely one than the phone case now proven.

### Also confirmed on production in the same pass

- The move opens unit 002's `AssignSheet` unmodified — same copy, same 9 stops, resolution line
  "Protein · following Protein to Protein"
- The list re-sorts with no reload
- An **item** placement is written (`cod fillet` -> Produce) and `category_placements` stays at 5 —
  the boundary this unit exists to enforce
- "Take it off the path" removes the placement cleanly

All test writes were reverted; production is back to baseline (`cod_placements` 0,
`category_placements` 5).
