---
stage: implement
bolt: 057-store-placement-control
created: '2026-09-05T20:55:00Z'
---

## Implementation Walkthrough: 002-store-placement-control (bolt 057)

### Story 004 — the review queue

`UnassignedSection.tsx` → **`NeedsReviewSection.tsx`**. A rename rather than an edit, because the
component's meaning changed: it no longer lists items with no location, it lists items nobody has
looked at.

The scope change is one line at the page level:

```
- allItems.filter((item) => item.state === 'unassigned')   // empty by construction
+ allItems.filter((item) => item.reviewedAt === null)      // things that arrived unchecked
```

**Each row asks "is that right?", not "where does this go?"** The item already has a stop, so the
row leads with where it currently sits and how it got there — reusing `AllGroceriesList`'s
phrasing verbatim so the two lists read as one vocabulary rather than two.

Two actions:

- **Looks right** — calls `markItemReviewed` and nothing else. Writes **no placement**: a
  category default the user agrees with is a decision, not the absence of one. If accepting
  wrote a placement, every confirmation would silently pin an item and the category lever would
  stop working for it.
- **Move it** — opens the assign flow. On success the page places **and** marks reviewed, because
  moving an item is reviewing it.

**Self-opening.** The section expands when there is something to check and stays shut when there
is not. A queue you have to go looking for gets ignored; an empty one demanding attention is
worse. Implemented as a nullable override so it follows the data until the user toggles it, then
respects the toggle.

### Story 005 — suggestions, and the silence

Same `findSimilarPlacedItems` call `AssignSheet` already makes, same candidate construction. Two
rules on top:

- **Absent, not announced.** When nothing clears the cutoff the block simply is not rendered —
  intent 010 FR-12's existing behaviour, not a new convention.
- **A suggestion matching the current inherited stop is suppressed.** Restating the default is
  noise; silence is more useful than agreement with the status quo.

**It will show nothing on day one, and that is expected.** Candidates come only from items with an
_explicit_ placement, and production has zero of those. The restriction is right — an inherited
item sits where its category points, which is evidence about the category, not the item — so the
fix is not to widen the pool. It bootstraps: place a few things by hand and the next arrival gets
a suggestion. The reasoning is a comment in the component so nobody "fixes" it by including
inherited items, which would make every suggestion restate the category default.

Flagged at the Stage 1 checkpoint and approved with that understanding.

### The in-recipe narrowing is gone

`useInRecipeNameKeys` and `fetchInRecipeNameKeys` **removed**, not hidden — along with their query
key and the page's call. Two reasons:

1. A review queue has no use for "used in at least one active recipe". An unreviewed item is
   worth checking whether or not a current dinner uses it.
2. It was half of why the old section was empty. Its default scope was _unassigned ∩ used in an
   active recipe_ — contradictory predicates, since an item with no surviving ingredient rows
   cannot also be referenced by an active dinner. That list could never have shown anything even
   if `unassigned` had been reachable.

Leaving the function behind would have left a trap: the next person to want a "default scope"
would find it and reuse the same broken idea.

### Marking reviewed invalidates the resolution query

`useMarkItemReviewed` goes through the existing `usePathMutation`, which invalidates both the
locations and resolution queries. The resolution one matters here: the view carries `reviewed_at`,
so the queue reads its own membership from it. Without the invalidation the row the user just
accepted would sit there until something else happened to refetch.

### Page composition — the promise from bolt 056

`/store` now reads:

```
Walking path            (the stops, always open)
New — needs review      (open when there is something; shut when there is not)
Where each kind of thing lives   (collapsed)
All groceries           (collapsed)
```

Re-read as promised. It holds, and the ordering is deliberate: the queue sits directly under the
path because it is the only section with a _reason to act today_. The other two are reference —
you open them when you want something. On a household with nothing to review, the page looks
almost exactly as it did before this intent: the path, and three one-line headers.

### Files

**New**: `NeedsReviewSection.tsx`
**Deleted**: `UnassignedSection.tsx`, `UnassignedSection.test.tsx`
**Changed**: `StoreConfigPage.tsx`, `hooks.ts` (+`useMarkItemReviewed`, −`useInRecipeNameKeys`),
`api.ts` (−`fetchInRecipeNameKeys`), `StoreConfigPage.test.tsx` (mock updated)
**Unchanged**: `similarity.ts`, `AssignSheet.tsx`, `AllGroceriesList.tsx`,
`CategoryPlacementSection.tsx`, `LocationRow.tsx`, `PlacementPill.tsx`

### Gate

`tsc -b` clean · `eslint` clean · vitest **291 / 291** (31 files)

The count dropped from 300/32 because `UnassignedSection.test.tsx` — nine cases asserting the
old unassigned-only behaviour — was deleted with its component. Story 006's requirement that no
orphaned tests remain is met by removal, not by rewriting them to pass.

### For Stage 3

The queue's regression test must be **verified to fail against the old scoping**, the way bolt
056's cap test was: swap `reviewedAt === null` back to `state === 'unassigned'` and confirm the
right case goes red. A test that passes against the bug is worse than no test.
