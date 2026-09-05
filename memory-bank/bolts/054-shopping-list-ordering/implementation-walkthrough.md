---
stage: implement
bolt: 054-shopping-list-ordering
created: '2026-09-04T23:15:00Z'
---

## Implementation Walkthrough: 003-shopping-list-ordering (bolt 054)

### Summary

The shopping list now orders its groups by the household's walking path instead of by the
retired `category → grocery_store_row.position` mapping. Groups stay category-based; only the
key they sort by changed.

With this, **no code path in `src/` reads the old model**. The last reader —
`legacy-store-rows.ts`, created by bolt 052 as a holding place — is deleted.

### Structure Overview

`reorderGroupsByRows(groups, rows, assignments)` became
`reorderGroupsByLocation(groups, resolvedItems)`. The page drops the two legacy query hooks and
reads the same `item_location_resolution` view the store-config page reads, through the same
`useResolvedItems` hook — one definition of where an ingredient sorts, two consumers.

`buildShoppingList` and `formatShoppingListText` are untouched.

### Completed Work

- [x] `src/features/shopping-list/reorder.ts` - `reorderGroupsByLocation`: minimum resolved position per group, unlocated groups last in alphabetical order.
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` - reads the active store and the resolution view; no longer reads rows or assignments.
- [x] `src/features/shopping-list/hooks.ts` - the two legacy hooks removed.
- [x] `src/features/shopping-list/legacy-store-rows.ts` - **deleted**.
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` - mocks re-pointed at `store-config/api`.
- [x] `src/features/shopping-list/reorder.test.ts` - removed; its subject function no longer exists. Rewritten in Stage 3 (story 002).

### Key Decisions

- **Groups stay category-based** — confirmed with the user at Stage 1. Every line of FR-17,
  story 001 and `storeconfig.md` says the list _sorts_ by resolved location; none says it
  regroups. Regrouping would have changed the headings, broken the category-icon lookup and the
  copy-to-clipboard format, for scope nothing asked for.

- **The sort key is the minimum resolved position among a group's items** — the earliest point
  on the path where you will find something from that group. It degrades exactly to the old
  behaviour rather than approximating it: post-cutover there are zero explicit placements, so
  every item in a category resolves through that category's own placement, all share one
  position, and the minimum _is_ that position.

- **Matching is by normalized name**, `trim().toLowerCase()` — deliberately identical to
  `items.name_key`'s generated `lower(btrim(name))`. That is what lets the client and the
  database agree on identity without a join, and it is called out in the function's own comment
  as something that must not drift.

- **The resolution hook is imported from `store-config`, not duplicated.** Unit 1 put resolution
  in a single view precisely so two features could not disagree; defining a second reader here
  would have undone that.

- **The stale-tie behaviour is unchanged and unchanged deliberately.** `Array.sort` is stable
  and `buildShoppingList` already emits groups alphabetically, so unlocated groups keep their
  alphabetical order with no tie-breaker — the same mechanism the old function relied on.

### Deviations from Plan

None.

### Dependencies Added

None. No new package, no schema change, no new theme token.

### Developer Notes

- **The retirement migration is now unblocked but deliberately not landed.** Three of its four
  preconditions are satisfied by this bolt; the fourth — migration A applied to production with
  its equivalence gate passing there — is an Operations concern and nothing from intent 010 has
  been deployed. Landing it here would drop the tables on the next local `db reset`, before
  anyone had watched migration A succeed against real data. See ADR-9 and
  `bolts/051-location-item-model/deferred-retirement-migration.sql`.

- **Verified: no code reference to the old model remains in `src/`.** A repo-wide grep returns
  only the generated `database.types.ts` (which regenerates when the tables are dropped) and one
  explanatory comment in `store-config/api.ts`. That is migration B's precondition 3, met.

- **`ShoppingListPage.test.tsx` now mocks an unconfigured store** (`fetchActiveStore → null`,
  `fetchResolvedItems → []`), so its groups fall back to alphabetical order — which is what
  those tests were always really asserting. The location sort itself belongs in
  `reorder.test.ts`, where Stage 3 covers it properly.
