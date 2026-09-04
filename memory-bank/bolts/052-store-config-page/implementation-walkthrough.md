---
stage: implement
bolt: 052-store-config-page
created: '2026-09-04T22:30:00Z'
---

## Implementation Walkthrough: 002-store-config-page (bolt 052)

### Summary

Replaced the two-panel "Rows + Category assignments" page with the walking path: one ordered
list of stops, sections and aisles as visual peers, with add / rename / reorder / remove and the
page's single destructive confirm. The similarity engine ships alongside as a standalone pure
module with no caller yet — bolt 053 wires it into the assign flow.

The store-config feature no longer references `grocery_store_rows` or
`category_row_assignments`. The shopping list still does, which was not anticipated by the plan
and is handled below.

### Structure Overview

The feature keeps its existing shape — `types.ts` / `api.ts` / `hooks.ts` plus a `components/`
folder — with every module rewritten against the new model. Two pure modules sit outside that
data flow (`similarity.ts`, `location-name.ts`) so they can be tested without React or Supabase.

The page composes three presentational components. Data fetching is one query per resource
rather than a join; the row's item preview and count come from grouping the resolution rows by
`location_id` in the page, which keeps `item_location_resolution` as the single source of
placement truth rather than re-deriving it client-side.

### Completed Work

- [x] `src/features/store-config/similarity.ts` - the suggestion engine: normalization, IDF-weighted token overlap, category bonus, dismissal exclusion, cutoff and top-N. All tuning in one exported constant.
- [x] `src/features/store-config/location-name.ts` - the single place the "aisle number is read from the name" rule lives, shared by storage and rendering.
- [x] `src/features/store-config/types.ts` - new-model row types plus the narrowed `ResolvedItem` and `PathStop` shapes.
- [x] `src/features/store-config/api.ts` - active store, locations, resolution rows, add / rename / delete, the reorder RPC, and the placement count for the confirm.
- [x] `src/features/store-config/hooks.ts` - React Query wrappers; one shared mutation helper so every path change invalidates both the locations and the resolution query.
- [x] `src/features/store-config/components/StoreConfigPage.tsx` - the page: grouping, loading/error states, removal orchestration, reorder announcements.
- [x] `src/features/store-config/components/LocationRow.tsx` - the stop row: chip, name, preview, count, arrows, chevron, inline rename, expanded item list.
- [x] `src/features/store-config/components/LocationTypeChip.tsx` - the peer-carrying chip; aisle number or section glyph.
- [x] `src/features/store-config/components/AddStopRow.tsx` - the inline dashed append affordance.
- [x] `src/features/store-config/components/DeleteLocationConfirm.tsx` - the count-stated destructive panel.
- [x] `src/shared/components/icons.tsx` - added `warning` (the only warning glyph in the app).
- [x] `src/features/shopping-list/legacy-store-rows.ts` - **new**: the old model's fetchers, relocated (see below).
- [x] `src/features/shopping-list/hooks.ts` - gained the two legacy query hooks.
- [x] `src/features/shopping-list/reorder.ts`, `components/ShoppingListPage.tsx`, and their tests - re-pointed at the relocated module.

### Key Decisions

- **`type` is derived from the name, never chosen.** The add affordance has no type selector:
  "Aisle 4" becomes an aisle, anything else a section, using the same rule the cutover migration
  applied. This is what makes the spec's "the number lives in the name" true rather than
  aspirational, and it means rename re-derives `type` for free.

- **`household_id` is passed explicitly on insert, not defaulted.** Unlike the retired
  `grocery_store_rows`, `locations.household_id` has no `current_user_household_id()` default —
  it is half of a composite FK into `stores (id, household_id)` (ADR-8). The active store row
  already carries the right value, and RLS still rejects any other, so this is explicit rather
  than clever.

- **One mutation helper invalidates both queries.** Adding, moving, renaming or removing a stop
  all change where items resolve. Wiring that once removes a whole class of "the list moved but
  the previews didn't" bug.

- **Removal decides its own path.** "Remove" reads the placement count first: zero deletes
  immediately with no dialog (story 002), non-zero raises the confirm (story 006). One control,
  two outcomes, decided by data rather than by a second button.

- **The filled `heart.500` button is styled at the call site.** No `danger` theme variant was
  added, per the unit brief and the spec — its scarcity is what makes it legible.

- **The 13px leading column is real.** Empty in v1, it is the reserved drag-handle region, so
  adding drag in v2 changes no other measurement in the row.

### Deviations from Plan

**The plan missed a cross-feature dependency.** `src/features/shopping-list/` imported
`GroceryStoreRow` / `CategoryRowAssignment` from `store-config/types` and `useRows` /
`useAssignments` from `store-config/hooks`. Rewriting store-config broke the shopping list's
compile — caught by `tsc -b`, not by the plan.

Resolved by **relocating** the old model's read path to `shopping-list/legacy-store-rows.ts`
(fetchers and types) plus two hooks in `shopping-list/hooks.ts`, rather than keeping it alive in
store-config. The shopping list is now its only consumer, and this project organizes by feature,
so that is where it belongs. Behaviour is unchanged; bolt 054 deletes the file when it switches
the sort to `item_location_resolution`.

The fetchers/hooks split matters: `ShoppingListPage.test.tsx` does a whole-module `vi.mock`, so
folding the hooks into the same module as the fetchers stubbed the hooks too and broke six
tests. Keeping the project's usual api/hooks separation fixed it.

**Two obsolete test files were deleted**, not updated: `store-config/api.test.ts` and
`components/StoreConfigPage.test.tsx` covered the two-panel behaviour that no longer exists.
Their replacements are Stage 3's work — this was called out as risk #2 in the plan.

### Dependencies Added

None. No new npm package, no new theme token, no new theme variant.

### Developer Notes

- **`similarity.ts` has no caller yet.** That is deliberate (the bolt's own note): land and test
  the pure function in isolation before wiring it into a flow. Bolt 053 consumes it.
- **The page cannot place an individual item yet** — the assign flow is bolt 053. Between these
  two bolts the path is configurable but item-level placement is unreachable in the UI. The page
  is genuinely incomplete until 053 lands.
- **Similarity normalization is where false friends are made.** `singularize` is deliberately
  conservative (it refuses words ≤3 chars and anything ending `ss`) so it cannot mangle
  "molasses" into a collision. If tuning is needed later, `SIMILARITY_TUNING.scoreCutoff` is the
  first knob.
- **Scoring normalizes against the longer side.** "milk" vs "coconut milk" shares all of the
  query's weight but only part of the candidate's — dividing by the max keeps a short name from
  being trivially "contained" in a longer one.
