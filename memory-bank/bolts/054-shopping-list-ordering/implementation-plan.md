---
stage: plan
bolt: 054-shopping-list-ordering
created: '2026-09-04T23:10:00Z'
---

## Implementation Plan: 003-shopping-list-ordering (bolt 054)

### Objective

Swap the shopping list's group-ordering sort key from `category → grocery_store_row.position`
to each ingredient's resolved `Item → Location` position, preserving the unlocated-last
fallback — and prove the swap is equivalent for an already-configured household.

This is the last bolt of intent 010, and the one that deletes the last reader of the retired
model.

---

### Deliverables

- `src/features/shopping-list/reorder.ts` — `reorderGroupsByRows` replaced by
  `reorderGroupsByLocation`, taking resolved items instead of rows and assignments.
- `src/features/shopping-list/components/ShoppingListPage.tsx` — reads the resolution query
  instead of the legacy rows/assignments hooks.
- `src/features/shopping-list/hooks.ts` — the two legacy hooks removed.
- **`src/features/shopping-list/legacy-store-rows.ts` — deleted.**
- `src/features/shopping-list/reorder.test.ts` — reworked, plus the cutover equivalence fixture.

---

### Dependencies

- **Bolt 051 (complete)** — `item_location_resolution` and the cutover that populates it.
- **Bolt 052/053 (complete)** — `fetchResolvedItems` / `useResolvedItems` already exist in
  `store-config` and are reused rather than duplicated.
- **No new npm package, no schema change, no new theme token.**

---

### Technical Approach

**Groups stay category-based; only the sort key changes.** Confirmed with the user at this
bolt's Stage 1. Every line of FR-17, story 001 and `storeconfig.md` says the list _sorts_ by
resolved location — none says it regroups. Regrouping would change the headings, break the
category-icon lookup and the copy-to-clipboard format, for scope nothing asks for.

**The sort key is the minimum resolved position among a group's items.** A group sorts to the
earliest point on the path where you'll find something from it. Deterministic, and it degrades
exactly to the old behaviour: post-cutover there are **zero** explicit placements, so every
item in a category resolves through that category's own placement, every item in a group shares
one position, and `min` is simply that position.

**Matching an aggregated item to a resolved one is by normalized name.** `ShoppingListItem`
carries a display `name`; `ResolvedItem` carries `nameKey` (`lower(btrim(name))` — the
registry's own dedup key). The lookup normalizes the same way, so the client and the database
agree on identity without a join.

**The fallback is preserved exactly.** A group with no resolvable position sorts after every
located group, and ties keep their existing relative (alphabetical) order — `Array.sort` is
stable, and `buildShoppingList` already emits groups alphabetically.

**Reuse, don't duplicate.** `fetchResolvedItems` and `useResolvedItems` already exist in
`store-config`. The shopping list imports them. That keeps one definition of how resolution is
read, which is the whole point of unit 1 putting resolution in a single view.

---

### Acceptance Criteria

**Story 001 — sort by location**

- [ ] The sort key is each ingredient's resolved `Item → Location` position, not
      `category → grocery_store_row.position`
- [ ] An ingredient whose item has no resolved location falls after all located groups,
      alphabetically
- [ ] `buildShoppingList`'s aggregation/merge logic is untouched
- [ ] For an already-configured household post-cutover, the group order is equivalent to what
      the old model produced

**Story 002 — tests**

- [ ] Sort by resolved position; unassigned last, alphabetically; ties grouped together
- [ ] **An equivalence fixture**: the same household's data expressed in the old model
      (`rows` + `assignments`) and the new one (resolved items), sorted by both functions,
      producing an identical group order
- [ ] The rest of the shopping-list suite stays green apart from intentional assertion changes

**Quality**

- [ ] `tsc -b`, `eslint`, `vite build` clean; full suite green
- [ ] No reference to `grocery_store_rows`, `category_row_assignments`, or
      `reorder_grocery_store_row` remains anywhere in `src/`

---

### The retirement migration

Deleting `legacy-store-rows.ts` satisfies the last outstanding precondition on
`memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql` (ADR-9). Its four
preconditions after this bolt:

1. ✅ Unit 002 reads the new model — done in bolt 053
2. ✅ Unit 003 sorts by the resolution view — this bolt
3. ✅ No reference to the old tables in `src/` — this bolt (asserted by the quality gate above)
4. ⏳ **Migration A applied to production and its equivalence check passed there** — not yet;
   nothing from intent 010 has been deployed

**Recommendation: do not land migration B in this bolt.** Precondition 4 is an Operations
concern, and the two migrations would ship in the same deploy anyway (A then B by timestamp
order, with A's `raise exception` gate running first). Landing it here would also mean the local
`supabase db reset` drops the tables before anyone has watched migration A succeed against real
production data — which is exactly the caution ADR-9 exists to encode.

The right sequence is: ship intent 010, confirm migration A's gate passed on prod, then land
migration B as a small follow-up. This bolt makes it _possible_, and says so; Operations
decides _when_.

---

### Risks

1 - **The equivalence fixture is the deliverable, not a formality.** Unit 1's FR-10 "no
regression" promise is verified in two places: migration A's in-transaction gate (data level,
bolt 051) and this fixture (presentation level). If the fixture is constructed carelessly — say
with a household whose categories all sort alphabetically anyway — it proves nothing. It needs a
path order that is _not_ alphabetical.

2 - **Name-key matching is the seam between two systems.** The client normalizes with
`trim().toLowerCase()`; the database generates `lower(btrim(name))`. These agree today. A test
asserts the match works for a name with different casing and surrounding whitespace, so a drift
in either direction fails loudly.
