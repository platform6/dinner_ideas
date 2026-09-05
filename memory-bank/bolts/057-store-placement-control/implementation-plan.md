---
stage: plan
bolt: 057-store-placement-control
created: '2026-09-05T20:30:00Z'
---

## Implementation Plan: 002-store-placement-control (bolt 057)

### Objective

Turn the permanently-empty "Not on the path yet" section into a working review queue, give each
row a suggested stop where one can be found, and prove the whole unit with fixtures that resemble
production rather than states the model cannot reach.

This completes unit 002.

### Stories

| Story                               | Priority |
| ----------------------------------- | -------- |
| 004-needs-review-section            | Must     |
| 005-similarity-suggestion-on-review | Should   |
| 006-store-placement-tests           | Must     |

### ⚠️ Finding before implementation — story 005 is inert on day one

`findSimilarPlacedItems` draws its candidate pool **only from items with an explicit placement**:

```ts
allItems.filter((other) => other.state === 'placed' && ...)
```

That restriction is correct and deliberate — the code says why: _"An inherited item sits where
its category happens to point, which says nothing about this item."_ Evidence of a user's
judgement is what makes a suggestion meaningful.

But production has **zero** explicit placements:

```
state       count          item_placements
inherited     121          0
```

So the candidate pool is empty, and **no suggestion will appear for any item** until the
household has placed something by hand. Story 005 will ship doing nothing visible.

This is the same shape as the defect that started intent 013 — a feature that is structurally
inert given the real data distribution — and it deserves to be named before it is built, not
discovered afterwards.

**It is not the same severity.** The queue itself (story 004) works with or without suggestions:
each row shows where the item currently sits, how it got there, and offers Accept or Move.
Suggestions are assistance layered on top, and their absence is already specified — story 005's
third criterion says the row simply shows the inherited stop when nothing clears the cutoff.

**Recommendation: build it anyway**, and say plainly in the walkthrough that it is silent until
the user places a few items. Reasons:

- It bootstraps naturally. Place three things by hand; the fourth gets a suggestion.
- Widening the pool to inherited items would make suggestions worse, not earlier: every item in
  a category would "suggest" that category's stop, which is what already happens by inheritance.
  A suggestion that restates the default is noise.
- The alternative assistance is intent 014's Claude escalation, which is exactly designed for
  what local similarity cannot resolve — and it has more to work with once some placements exist.

**Alternative, if you disagree:** cut story 005 from this bolt (it is `Should`) and let intent
014 own suggestion assistance entirely. The queue works without it. Raised at this checkpoint.

### Deliverables

**Changed**

- `UnassignedSection.tsx` → **renamed** `NeedsReviewSection.tsx`. Re-scoped from
  `state === 'unassigned'` (empty by construction) to `reviewedAt === null`. Two actions per row:
  Accept (marks reviewed, writes no placement) and Move (opens the assign flow, which also marks
  reviewed).
- `StoreConfigPage.tsx` — mount the renamed section; drop `useInRecipeNameKeys`; wire
  `markItemReviewed` into both the accept action and the existing place path.
- `hooks.ts` — `useMarkItemReviewed(storeId)`, invalidating the resolution query.
- `api.ts` — remove `fetchInRecipeNameKeys` (no remaining caller).
- `UnassignedSection.test.tsx` → `NeedsReviewSection.test.tsx`, rewritten.

**Removed**

- `useInRecipeNameKeys` / `fetchInRecipeNameKeys` and their query key. The in-recipe narrowing
  was half of why the old section was empty, and a review queue has no use for "used in at least
  one recipe" — an unreviewed item is worth checking whether or not a current dinner uses it.

**Unchanged**

- `similarity.ts`, `AssignSheet.tsx`, `PlacementPill.tsx`, `AllGroceriesList.tsx`,
  `CategoryPlacementSection.tsx`, `LocationRow.tsx`

### Dependencies

| Dependency                                                 | State                                             |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `items.reviewed_at` + `mark_item_reviewed` RPC (bolt 055)  | ✅ landed                                         |
| `markItemReviewed` client wrapper (bolt 055)               | ✅ landed, no caller yet — this bolt is its first |
| `ResolvedItem.reviewedAt` projected on the view (bolt 055) | ✅ landed                                         |
| `findSimilarPlacedItems` (intent 010 FR-7)                 | ✅ exists; see the finding above                  |
| `AssignSheet`                                              | ✅ reused unchanged                               |

### Technical Approach

**Story 004.** The queue is `allItems.filter((i) => i.reviewedAt === null)`, sorted
alphabetically — no new query; the resolution view already carries `reviewed_at`. Each row shows
the item, its current stop, and its provenance, reusing the phrasing `AllGroceriesList` settled
on so the two lists read the same way. Accept calls `markItemReviewed` and nothing else —
accepting a category default is a valid answer and must not write a placement. Move opens the
assign flow; on success the page marks reviewed as well.

**Story 005.** Same call `AssignSheet` already makes, with the same candidate construction. If
the result is empty the row renders no suggestion block at all — omission, not an announcement
of absence, matching intent 010 FR-12's existing behaviour. Suppress a suggestion that names the
stop the item already inherits: restating the default is noise.

**Story 006.** Covered in the test stage rather than as separate code. The rule: every fixture in
this unit is built from a realistic distribution — items `inherited`, none `unassigned` — and a
test needing an unassigned item must construct a genuine registry orphan. A shared
`storeFixture` helper is the practical way to stop the rule eroding.

### Acceptance Criteria

**Story 004**

- [ ] Lists every item with `reviewedAt === null`, in any placement state
- [ ] Row names the item, its current stop, and how it got there
- [ ] Accept marks reviewed, writes **no** placement, and the row leaves the list
- [ ] Move opens the assign flow; completing it places **and** marks reviewed
- [ ] Empty state: "Nothing new to check." — neutral, no red
- [ ] `useInRecipeNameKeys` / `fetchInRecipeNameKeys` removed, not hidden

**Story 005**

- [ ] A suggestion appears when one clears the cutoff, naming the similar item
- [ ] Accepting it places and marks reviewed in one action
- [ ] No suggestion block at all when nothing clears the cutoff
- [ ] Dismissals respected
- [ ] No network call, no API key needed
- [ ] A suggestion identical to the current inherited stop is suppressed

**Story 006**

- [ ] A case asserts an unreviewed **inherited** item appears in the queue
- [ ] A case asserts Accept writes no placement
- [ ] Fixtures use a realistic distribution; an unassigned item is a genuine orphan
- [ ] No orphaned tests assert the old unassigned-only behaviour
- [ ] The queue regression test is **verified to fail** against the old scoping, the way bolt
      056's cap test was

### Risks

| Risk                                           | Handling                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Story 005 ships invisible and reads as broken  | Named above; state it in the walkthrough and the release notes rather than letting it surprise someone |
| Renaming the component leaves stale references | `tsc -b` catches every one                                                                             |
| The page now carries four sections             | Re-read the whole composition at the Stage 2 checkpoint, as promised in bolt 056                       |
| "Produce" naming the same thing twice          | Watch it in the queue's provenance line; flagged in bolt 056                                           |

### Out of Scope

- The shopping-list move — bolt 058
- Claude-assisted matching — intent 014
- Registry orphan cleanup — intent 013 open question
- Any schema change
