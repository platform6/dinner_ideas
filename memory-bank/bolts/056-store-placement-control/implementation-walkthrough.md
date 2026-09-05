---
stage: implement
bolt: 056-store-placement-control
created: '2026-09-05T19:50:00Z'
---

## Implementation Walkthrough: 002-store-placement-control (bolt 056)

Built in the planned order — 003 → 002 → 001 — so each piece had somewhere to land.

### Story 003 — uncapped stop rows

`LocationRow.tsx`: removed `EXPANDED_ITEM_CAP = 4`, the `visibleItems` slice, `hiddenItemCount`
and the "+ N more" line. The expanded list now renders `items` directly.

`PREVIEW_NAME_CAP` **stays**, and the distinction is now written into its comment: the
_collapsed_ preview abbreviates names and says how many it omitted, while the count beside the
row has always been `items.length` — the true total. Only the expanded list was lying, and only
by hiding the pill that was one of two ways into the assign flow.

Net: −9 lines. The smallest change in the bolt and the one that unblocked ~100 groceries.

### Story 002 — category moves

**`types.ts`** — `INGREDIENT_CATEGORIES` (the CHECK set as a const), `IngredientCategory`, and
`CategoryPlacementView` pairing a category with its stop, nullable because sitting nowhere is
normal.

The constant is deliberate. Deriving the list from existing `category_placements` rows would
make an **unplaced** category invisible, and therefore unplaceable — the same shape of bug that
made three stops unreachable. A category you cannot see is a category you cannot place.

**`api.ts`** — three functions:

- `fetchCategoryPlacements(storeId)` — joins through to the location for its name and position,
  then maps over `INGREDIENT_CATEGORIES` so all five come back whether or not they have a row
- `setCategoryPlacement(store, category, locationId)` — upsert on `(store_id, category)`,
  mirroring `placeItem`. The conflict target is what makes this a **move**: the unique
  constraint means a category sits in one place per store no matter what the UI claims
- `unsetCategoryPlacement(storeId, category)` — a delete, because absence of the row _is_ "not
  placed" (Resolved Decision 3), the rule `unplaceItem` already follows

**`hooks.ts`** — `useCategoryPlacements`, `useSetCategoryPlacement`, `useUnsetCategoryPlacement`,
over a new `useCategoryMutation` that invalidates **both** the category query and the resolution
query. The second is the one that matters: a category move relocates every inheriting item, so
the stops' lists and pills all change even though no `item_placements` row moved. Refreshing
only the category list would leave the page insisting items are where they were.

**`CategoryPlacementSection.tsx`** — collapsed section listing all five, each with its current
stop or "Nowhere yet", a Move action opening an inline stop picker, and "Take X off the path"
offered only when there is something to remove. Copy states the asymmetry directly — _"Moving a
category moves everything that follows it. Anything you placed yourself stays put."_ — rather
than leaving the user to infer it.

**No migration.** `category_placements` carries full RLS policies and ordinary table grants from
intent 010; this is simply the first code to write to it. Confirmed before starting.

### Story 001 — all groceries

**`AllGroceriesList.tsx`** — a collapsed section over the resolution query already loaded by
`useResolvedItems`. No new query, no round trip per keystroke.

- Search normalizes with `trim().toLowerCase()` to match `items.name_key`, the rule `reorder.ts`
  already uses so client and database agree on identity without a join
- Sorted alphabetically once; search narrows without reordering, so a row does not move under
  the finger between keystrokes
- Each row's second line says where the item sits **and how it got there** — `Produce · follows
Dairy` versus `Pantry · you chose this`. That distinction tells the user which lever to pull:
  a category move for the first, an item move for the second
- Scope is every item in every state. Narrowing by state is precisely what made the old section
  useless

### One thing reconsidered mid-implementation

The first draft capped the unsearched list at 30 rows with a "search to narrow" note. It was
honest — search still reached everything — but it came out again. This bolt exists because a
display cap made most of the registry unreachable; answering that by adding a different cap
invites the same class of bug back. The section is collapsed by default so nothing renders until
asked for, 121 rows is trivial, and if a household ever reaches the ~500 the NFR targets, the
answer is virtualization rather than truncation. The reasoning is left in the code as a comment
so the next person does not re-add it.

### Page composition — the risk flagged at Stage 1

`/store` now reads: walking path → **where each kind of thing lives** → **all groceries** →
"not on the path yet" (bolt 057 re-scopes that one). All three new sections are **collapsed by
default**, so the page still opens as the walking path and nothing else — the header stays
"Walking path", and the additions announce themselves as one line each.

It holds for now. The composition is worth re-reading once bolt 057 lands, when the fourth
section arrives and the last of them stops being dead weight.

### Verified against real data

Ran directly against the local stack, which now carries production's shape:

| Check                                                                   | Result                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| 7 inherited `Dairy` items, 1 explicitly placed at `Pantry`              | fixture                                           |
| Move `Dairy` → `Produce` via the upsert `setCategoryPlacement` performs | the 7 inherited items moved to Produce            |
| The explicitly-placed `butter`                                          | **stayed at Pantry** — the resolution order holds |
| `category_placements` rows for `Dairy` afterwards                       | **1** — the upsert replaced, it did not add       |

That is FR-2's central acceptance criterion demonstrated end to end, at the data layer, before
any UI test asserts it.

### Files

**New**: `AllGroceriesList.tsx`, `CategoryPlacementSection.tsx`
**Changed**: `types.ts`, `api.ts`, `hooks.ts`, `LocationRow.tsx`, `StoreConfigPage.tsx`
**Untouched, as planned**: `AssignSheet.tsx`, `similarity.ts`, `PlacementPill.tsx`,
`UnassignedSection.tsx` (bolt 057's), `DeleteLocationConfirm.tsx`, `AddStopRow.tsx`,
`FirstRunPanel.tsx`

### Gate

`tsc -b` clean · `eslint` clean · vitest **290 / 290**

### Known, for Stage 3

`StoreConfigPage.test.tsx` mocks the api module and does not stub `fetchCategoryPlacements`, so
React Query logs _"Query data cannot be undefined"_. The component is unaffected —
`categoryPlacements.data ?? []` handles it — but the mock is now incomplete and the test is
quietly exercising a state the app never sees. Stage 3 fixes it rather than leaving a warning
that trains people to ignore warnings.
