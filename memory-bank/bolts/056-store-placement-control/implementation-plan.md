---
stage: plan
bolt: 056-store-placement-control
created: '2026-09-05T19:20:00Z'
---

## Implementation Plan: 002-store-placement-control (bolt 056)

### Objective

Make everything on `/store` reachable and movable. Today roughly 20 of 121 items can be reached,
only from the stop they already sit at, and no category can be moved at all. After this bolt any
grocery is findable by name and movable, any category can be relocated in one action, and a stop
lists what it actually holds.

This bolt does **not** touch the review queue — that is bolt 057.

### Stories

| Story                  | Priority |
| ---------------------- | -------- |
| 001-all-groceries-list | Must     |
| 002-category-move      | Must     |
| 003-uncapped-stop-rows | Must     |

### Deliverables

**New**

- `src/features/store-config/components/AllGroceriesList.tsx` — searchable list of every item,
  its stop, and how it got there; each row opens the existing assign flow
- `src/features/store-config/components/CategoryPlacementSection.tsx` — the five categories and
  where each currently sits, each movable
- `api.ts`: `fetchCategoryPlacements(storeId)`, `setCategoryPlacement(store, category,
locationId)`, `unsetCategoryPlacement(storeId, category)`
- `hooks.ts`: `useCategoryPlacements(storeId)`, `useSetCategoryPlacement(store)`,
  `useUnsetCategoryPlacement(storeId)` — all invalidating via the existing `usePathMutation`
  pattern so the resolution query refetches
- `types.ts`: a `CategoryPlacementView` shape pairing a category with its resolved stop

**Changed**

- `LocationRow.tsx` — remove `EXPANDED_ITEM_CAP`; render every item; add a category entry
  distinct from the items
- `StoreConfigPage.tsx` — mount the two new sections; pass category data down

**Not changed** — reused exactly as they are

- `AssignSheet.tsx`, `similarity.ts`, `PlacementPill.tsx`, `location-name.ts`,
  `DeleteLocationConfirm.tsx`, `AddStopRow.tsx`, `FirstRunPanel.tsx`
- `UnassignedSection.tsx` — bolt 057 re-scopes it. Leaving it alone here keeps this bolt's diff
  about placement mechanics and avoids two bolts editing the same file

### Dependencies

| Dependency                                                       | Why                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bolt 055 (`items.reviewed_at`, projected on the resolution view) | Already landed. This bolt does not read it, but shares the query it rides on                                                                                                         |
| `category_placements` CRUD policies (intent 010 migration A)     | Story 002's writes. **Verified present**: SELECT/INSERT/UPDATE/DELETE all exist for `authenticated`, and the table has full table-level grants — unlike `items`. No migration needed |
| `AssignSheet` (intent 010 FR-12)                                 | Every move in this bolt opens it. New callers only                                                                                                                                   |
| `item_location_resolution`                                       | Single source of placement truth. Unchanged                                                                                                                                          |

### Technical Approach

**Story 001 — all-groceries list.** `useResolvedItems` already returns every item with `state`,
`viaCategory`, `locationName` and `locationPosition`. The list is a client-side filter over that
existing array — no new query, no round trip per keystroke. Search normalizes with
`name.trim().toLowerCase()` to match `items.name_key`, the same rule `reorder.ts` already uses.
Each row's move action calls the page's existing `openAssignSheet`.

**Story 002 — category move.** `category_placements` has full CRUD policies and is currently only
ever counted (`countPlacementsAtLocation`). The write is an upsert on the existing
`unique (store_id, category)`, mirroring how `placeItem` upserts `item_placements`:

```
setCategoryPlacement   → upsert { household_id, store_id, category, location_id }
                         onConflict: 'store_id,category'
unsetCategoryPlacement → delete where store_id + category
```

Upsert-on-conflict is what makes it a **move** rather than an add, at the data layer as well as
in the copy. The five categories come from a constant matching the `dinner_ingredients` CHECK —
they are not derivable from placements, since an unplaced category must still be listed.

**Story 003 — uncapped rows.** Delete `EXPANDED_ITEM_CAP` and the `hiddenItemCount` branch;
render `items` directly. The collapsed preview keeps `PREVIEW_NAME_CAP` for _names_ but its count
already reads `items.length`, which is the true total — so that part is already correct and
needs no change. Add a category entry above the item list when a category resolves to this stop.

**Ordering.** 003 → 002 → 001. Uncapping is the smallest change and makes the page honest
immediately; the category entry in `LocationRow` then has somewhere to live; the all-groceries
list is the largest piece and benefits from both being settled.

### Acceptance Criteria

**Story 001**

- [ ] Lists every item in the registry, in every placement state — including `inherited`, which
      is all 121 of them today
- [ ] Search matches case- and whitespace-insensitively, consistent with `items.name_key`
- [ ] Each row shows name, current stop, and provenance (chosen vs. inherited, naming the
      category)
- [ ] Each row opens `AssignSheet` for that item
- [ ] A registry orphan with no stop renders neutrally — no red, no warning
- [ ] Alphabetical by name; search narrows without reordering
- [ ] `spaghetti` is findable and movable — the concrete thing that was impossible

**Story 002**

- [ ] Each of the five categories can be assigned to any stop
- [ ] Moving a placed category **replaces** its mapping; never two rows for one category
- [ ] Items inheriting from it visibly move
- [ ] An item with its **own** placement does **not** move — the resolution order holds and is
      observable
- [ ] A category can be unplaced; its items become unassigned, neutrally
- [ ] The shopping list re-sorts on next read

**Story 003**

- [ ] An expanded stop lists **all** items — no truncation, no hidden count
- [ ] Every listed item offers the move action
- [ ] A category placed at the stop shows as an entry distinct from the items
- [ ] Collapsed preview count equals the true total
- [ ] A stop holding 39 items stays smooth on mobile

**Whole bolt**

- [ ] `Bakery`, `Aisle 1` and `Garmantasdf` can each receive an item
- [ ] `tsc -b`, `eslint`, `vitest` green
- [ ] No new migration — if one seems needed, that is a finding to raise

### Risks

| Risk                                                                                      | Handling                                                                                                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A `category_placements` policy proves missing or wrong                                    | Raise it; do not add a migration in this unit. (Pre-checked: policies are present)                                                   |
| The page grows into a wall of controls — path, categories, all groceries, and 057's queue | Watch the whole-page composition, not just each section. Flag it at the Stage 2 checkpoint if it reads badly rather than shipping it |
| Uncapped rows hurt mobile scrolling                                                       | Produce holds 39 items in production; that is the case to check                                                                      |
| Test fixtures drift toward impossible states                                              | Story 006 (bolt 057) owns the rule, but this bolt's tests should already build from `inherited` items rather than `unassigned` ones  |

### Out of Scope

- The review queue and similarity suggestions on it — bolt 057
- Re-scoping `UnassignedSection` — bolt 057
- The shopping-list move — bolt 058
- Any Claude/API call — intent 014
- Any schema change
