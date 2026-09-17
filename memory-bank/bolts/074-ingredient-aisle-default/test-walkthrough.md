---
stage: test
bolt: 074-ingredient-aisle-default
created: '2026-09-17T16:35:50Z'
---

## Test Report: ingredient-aisle-default

### Summary

- **Tests**: 761/761 passed across 46 files (735 before this bolt; +26)
- **Coverage**: not measured. The coding standards set no percentage target; each rule below is
  pinned by a test that was shown to fail when the rule is broken.
- `tsc -b` and `eslint src --max-warnings=0` pass; every changed file passes Prettier.

### Test Files

- [x] `src/features/recipe-entry/draft.test.ts`
  - fixtures updated: `validDraft()` now picks an aisle, as does the fractional-quantity case
  - new line starts with no aisle, source unset
  - an unset aisle fails validation with "Choose an aisle." on that line
  - history: keyed by `nameKey`, the most recent dinner wins whatever the row order, "chicken
    thighs, cubed" stays separate, and an unknown category or blank name is skipped
  - rename: fills an unset aisle on a match; leaves it unset on a miss; a history-filled aisle
    refills on a match and clears on a miss; a chosen aisle never changes through any rename; picking
    the same aisle history filled makes it chosen; inputs are not mutated
- [x] `src/features/recipe-entry/import/parse.test.ts` - every imported line is marked chosen
- [x] `src/features/recipe-entry/api.test.ts`
  - save refuses a line with no aisle and makes no RPC call
  - the payload carries the aisle and never `categorySource`
  - history reads `dinner_ingredients` with `name, category, dinners(created_at)` and no active
    filter
  - rows are flattened and a row whose dinner isn't visible is skipped
  - errors are thrown
- [x] `src/features/recipe-entry/components/RecipeEntryPage.test.tsx`
  - `fetchAisleHistory` is mocked, so no test reaches the real Supabase client; `fillValidDraft`
    picks an aisle
  - the options list starts with a disabled "Choose aisle"
  - new lines show "Choose aisle"
  - saving with an unset aisle writes nothing, and the one error is on the right line, marked
    `aria-invalid` and referenced by its `aria-describedby`
  - a typed name fills from the most recent dinner, ignoring spacing and case
  - a filled aisle follows the name and clears on ", cubed"
  - a picked aisle survives typing a known name
  - a filled aisle is what gets saved
  - an imported aisle survives both disagreeing history and a name edit
  - history is fetched once, and 22 keystrokes make no further request

### Regression proof

Three rules were broken on purpose and restored afterwards. Each was caught:

- **New lines default to Produce again**: 12 tests failed, across draft, api and page.
- **Rename ignores a chosen aisle**: 4 tests failed, including the page's "never overwrite an aisle
  the cook picked" and the import test.
- **Imports not marked chosen**: 2 tests failed, the parse test and the page's import test.

### Acceptance Criteria Validation

- ✅ **A new manual line shows "Choose aisle"**, not Produce
- ✅ **Saving with an unset aisle** writes nothing and shows "Choose an aisle." on that line, linked
  to its control
- ✅ **With every aisle set**, the payload is unchanged in shape and has no `categorySource`
- ✅ **"Choose aisle" can't be re-selected**: it is a disabled option
- ✅ **A matching name fills from the most recent dinner**, trimmed and case-insensitive. The read
  has no active filter, so "Not interested" dinners count (asserted on the query, not live)
- ✅ **A picked aisle is never changed** by a later name change
- ✅ **A history-filled aisle follows the name**: refill on a match, "Choose aisle" on a miss
- ✅ **"chicken thighs, cubed" does not match** "chicken thighs"
- ✅ **Imported aisles are kept**, against disagreeing history and after a name edit
- ✅ **One history fetch per form open**; typing makes no further requests
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

None in this bolt's scope.

### Notes

- **Not verified against a live database.** The history read's embed `dinners(created_at)`
  type-checks against the generated schema types, which only allow an embed along a real foreign
  key (`dinner_ingredients_dinner_id_fkey`), but no request has been made against Supabase. Worth
  one check at release: open Add a dinner, type an ingredient already in the catalog, and see its
  aisle fill.
- **Not verified in a browser.** jsdom confirms the disabled placeholder option and the ARIA
  wiring. A real browser's rendering of a disabled first option in a `<select>` is standard, but it
  hasn't been looked at on a phone.
