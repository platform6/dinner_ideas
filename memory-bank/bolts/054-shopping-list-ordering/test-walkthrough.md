---
stage: test
bolt: 054-shopping-list-ordering
created: '2026-09-04T23:20:00Z'
---

## Test Report: 003-shopping-list-ordering (bolt 054)

### Summary

- **Frontend**: 290/290 passing (32 files) — **10 new** in `reorder.test.ts`
- **Database**: 339/339 pgTAP still green (untouched by this bolt, but the intent ships together)

| Gate                   | Result           |
| ---------------------- | ---------------- |
| `npx vitest run`       | 290/290 passed   |
| `npx supabase test db` | 339/339 passed   |
| `npx tsc -b`           | Clean            |
| `npx eslint src/`      | Clean            |
| `npx vite build`       | ✓ built in 4.00s |

### Test Files

- [x] `src/features/shopping-list/reorder.test.ts` - **10 new**, rewritten from scratch: 7 for the sort itself, 3 for cutover equivalence.
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` - unchanged assertions; mocks re-pointed at `store-config/api` with an unconfigured store, so its groups fall back to alphabetical — which is what those tests were always really asserting.

### Acceptance Criteria Validation

**Story 001 — sort by location**

- ✅ The sort key is each ingredient's resolved location position — asserted with an
  alphabetical input list and a deliberately non-alphabetical path
- ✅ An ingredient with no resolved location sorts after every located group
- ✅ Unlocated groups keep alphabetical order among themselves
- ✅ `buildShoppingList`'s aggregation is untouched — no test of it changed
- ✅ Post-cutover output is equivalent to the old model (below)

**Story 002 — tests**

- ✅ Sort by resolved position
- ✅ Unassigned last, alphabetically
- ✅ Ties: two ingredients at the same stop stay in one group, and the group stays in one place
- ✅ **The equivalence fixture** — see below
- ✅ The rest of the shopping-list suite is green with no assertion changes

**Quality**

- ✅ No reference to `grocery_store_rows`, `category_row_assignments`, or
  `reorder_grocery_store_row` remains in `src/`, outside the generated `database.types.ts` and
  one explanatory comment

### The equivalence fixture

This is the presentation-level half of unit 1's FR-10 "no regression" promise. (The data-level
half is migration `20260904190000`'s own in-transaction gate.)

`legacyOrder` is a faithful transcription of the retired `reorderGroupsByRows`, kept in the test
as a **reference implementation** rather than as dead production code — so the file states the
old rule and the new one side by side and asserts they agree.

The fixture is a configured household whose walking order is deliberately **not** alphabetical:

| Path position | Stop    | Category placed there |
| ------------- | ------- | --------------------- |
| 1             | Bakery  | Grains                |
| 2             | Produce | Produce               |
| 3             | Aisle 3 | Pantry                |
| 4             | Dairy   | Dairy                 |

Groups arrive alphabetically (`Dairy, Grains, Pantry, Produce`) and must come out as
`Grains, Produce, Pantry, Dairy` under both functions.

Three assertions:

1. **Identical order** from the old function and the new one for the same household.
2. **The order is the household's actual walking order, not alphabetical.** This guards the
   guard: without it, a sort that did nothing would satisfy assertion 1 — both sides would be
   "unsorted" and still agree. This was named as risk #1 in the plan, and it is the reason the
   fixture's path is non-alphabetical.
3. **They still agree when a category has no spot on the path** — the partial-configuration
   case, with the unplaced category landing last under both.

### Issues Found

**None.** Every criterion passed on first run, and no defect surfaced in the implementation or
in the tests.

That is worth a word of scepticism rather than celebration: this bolt is small (one function,
one call site, one deletion) and its behaviour degrades to the old behaviour by construction, so
a clean first run is the expected outcome rather than evidence of unusual care. The assertion
that would actually have caught a mistake is #2 above.

### Notes

- **The name-key seam is asserted.** One test passes `'  CHEDDAR  '` as the display name against
  a resolved `nameKey` of `'cheddar'`. The client normalizes `trim().toLowerCase()`; the database
  generates `lower(btrim(name))`. If either drifts, nothing matches and every group silently
  falls back to alphabetical — a failure that would otherwise look like "the sort just doesn't
  work" with no error anywhere.

- **A group follows its earliest item.** With an explicit placement at position 1 and an
  inherited one at position 5, the group sorts to 1. Asserted, because it is the one case where
  the new behaviour genuinely differs from the old — and it is unreachable at launch, since the
  cutover creates zero explicit placements.

- **`ShoppingListPage.test.tsx` no longer exercises the sort at all.** It mocks an unconfigured
  store, so ordering is alphabetical there and the location sort is covered where it belongs, in
  `reorder.test.ts`. That is a deliberate narrowing, not lost coverage.
