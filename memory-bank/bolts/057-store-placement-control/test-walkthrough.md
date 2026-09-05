---
stage: test
bolt: 057-store-placement-control
created: '2026-09-05T21:15:00Z'
---

## Test Report: 002-store-placement-control (bolt 057)

### Summary

| Check            | Result                      |
| ---------------- | --------------------------- |
| Unit + component | ✅ **305 / 305** (32 files) |
| Type check       | ✅ `tsc -b` clean           |
| Lint             | ✅ `eslint src` clean       |

Fourteen new cases: five at page level for the queue's wiring, nine at component level for the
queue's own behaviour and the suggestion rules. Nine cases were **deleted** with
`UnassignedSection.test.tsx`, so the net is 291 → 305.

### Test Files

- [x] `NeedsReviewSection.test.tsx` — **new.** The queue's own behaviour, the orphan case, and
      all four suggestion rules
- [x] `StoreConfigPage.test.tsx` — extended with the queue's page wiring: membership, accept,
      move, and the empty state
- [x] `UnassignedSection.test.tsx` — **deleted** with its component. Story 006 requires no
      orphaned tests asserting the old behaviour; met by removal, not by rewriting them to pass

### Story 006 — the fixture rule, made concrete

`NeedsReviewSection.test.tsx` opens with the rule and three constructors that enforce it:

- **`item()`** — defaults to `inherited` and `reviewed`, which is production's shape after intent
  010's cutover and bolt 055's backfill
- **`arrived()`** — unreviewed; what a newly imported ingredient looks like the moment its Item
  is registered
- **`orphan()`** — the only honest way to build an `unassigned` item: no category, therefore no
  inheritance, therefore no stop. A test wanting an unassigned item must go through this rather
  than setting `state` by hand

That last one is the whole point. Intent 010's suites built `unassigned` items directly and
passed 290/290 while the feature was unreachable in production. **A fixture that cannot occur in
production proves nothing about production.**

### The regression check — verified, not assumed

The scoping was temporarily reverted to the old `state === 'unassigned'` and the suite re-run:

```
× lists an unreviewed INHERITED item — the case the old section could not show
× shows where it already sits and how it got there
× "Looks right" marks reviewed and writes NO placement
× "Move it" opens the assign flow, and placing marks reviewed too
× says nothing is outstanding when everything has been checked
  Tests  6 failed | 28 passed (34)
```

All five queue cases went red. The scoping was restored and the suite returned green. This is the
second bolt in a row to run this check, and it is becoming the habit worth keeping: a test that
passes against the bug is worse than no test.

_(The sixth failure was a pre-existing case, "never shows an unassigned item against a stop",
which also depends on that filter. Expected collateral of the revert, not a finding.)_

### Acceptance Criteria Validation

**Story 004 — the review queue**

- ✅ Lists every item with `reviewedAt === null`, in any placement state — asserted with an
  **inherited** item, the case the old section could not show
- ✅ Row names the item, its current stop, and how it got there (`Bakery · follows Grains`)
- ✅ Accept marks reviewed and writes **no** placement — `expect(placeItem).not.toHaveBeenCalled()`
- ✅ Move opens the assign flow; placing marks reviewed as well
- ✅ Empty state calm and vacuously true, both collapsed and expanded
- ✅ `useInRecipeNameKeys` / `fetchInRecipeNameKeys` removed — `tsc` proves no caller remains

**Story 005 — suggestions**

- ✅ A suggestion appears when one clears the cutoff, naming the similar item
- ✅ Accepting it hands back the item and the stop
- ✅ No suggestion block when nothing clears the cutoff
- ✅ Dismissals respected
- ✅ A suggestion restating the item's current inherited stop is suppressed
- ✅ **Silent on day one** — asserted explicitly, so the documented behaviour is pinned rather
  than merely described
- ✅ No network call, no API key (nothing in the path touches `callClaude`)

**Story 006 — tests**

- ✅ An unreviewed inherited item appears in the queue
- ✅ Accept writes no placement
- ✅ Fixtures follow a realistic distribution; the unassigned case goes through `orphan()`
- ✅ No orphaned tests asserting the old behaviour
- ✅ The regression test verified to fail against the old scoping

### Issues Found

**1 — Two assertions were ambiguous, both the test's fault.** The queue and the Bakery stop's
collapsed preview both render an item's name, and the suggestion line is interpolated across text
nodes. Re-asserted through unique `aria-label`s and a `textContent` matcher. The first is
legitimate app behaviour: an item genuinely appears in two places.

**2 — A fixture pair was sitting on the similarity cutoff.** `"sourdough bread"` vs
`"sourdough loaf"` share one token of two on each side, which normalizes to roughly the 0.5
cutoff — a coin-flip fixture that would fail on any tuning change. Replaced with
`"sourdough bread"` vs `"sourdough bread rolls"`, two shared tokens, comfortably clear. Worth
recording: a test poised exactly on a threshold tests the threshold, not the feature.

**3 — The body empty state is only reachable by expanding an empty section.** The queue collapses
itself when there is nothing to check, so `"Nothing new to check."` in the body renders only if
the user opens it deliberately. Not dead code, but the header line is what people will actually
see. Both are now asserted.

**4 — An existing fixture became legitimate mid-intent.** `StoreConfigPage.test.tsx` has an
`unassigned` item that carries a category (`cheddar`), which would have been impossible before
this intent — a category'd item always inherited, because all five categories were placed and
nothing could unplace them. Bolt 056's `unsetCategoryPlacement` makes it reachable: unplace a
category and its items become unassigned while keeping their category. The fixture is honest
again, for a new reason.

### Not Covered

- Similarity behaviour on a large registry — the engine has its own suite (`similarity.test.ts`)
- The shopping-list move — bolt 058
- Claude-assisted suggestions — intent 014
