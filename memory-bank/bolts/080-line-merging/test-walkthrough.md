---
stage: test
bolt: 080-line-merging
created: '2026-09-24T16:40:05Z'
---

## Test Report: line-merging

### Summary

- **Tests**: 826/826 passed, 51 files (798 at v0.17.0; 28 new). `tsc -b` and `eslint src --max-warnings=0` clean
- **Coverage**: no formal target (coding standards). Every rule in `merge-key.ts` and `aggregate.ts` is pinned by a test that a mutant was shown to break
- **Browser**: the household's full catalog (52 active dinners, 304 ingredient rows) run through the new build in the signed-in app: **151 lines → 128**

### Test Files

- [x] `src/features/shopping-list/merge-key.test.ts` - New. Comma-note removal, casing, plurals left alone, a prep word before the name kept, the empty-name fallback, look-alike pairs (two from the catalog), label/key agreement, unit singular/plural
- [x] `src/features/shopping-list/aggregate.test.ts` - Existing tests moved to the new line shape; the mismatched-units test now expects one line with two amounts (FR-2). New: comma-note merge, diced tomatoes kept apart, unit plurals summed, tbsp/tsp not converted, first-appearance label and amount order, source names, shuffled input
- [x] `src/features/shopping-list/format.test.ts` - Moved to the new shape. New: `formatAmounts` joins with " + ", a unitless amount has no trailing space, 0 is kept, and the clipboard uses the same text as the row
- [x] `src/features/shopping-list/reorder.test.ts` - Fixture moved to the new shape; no behaviour change
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` - New: a comma-note variant renders one row reading "2 lb + 4" / "Chicken thighs", with no "cubed", and copies "- 2 lb + 4 Chicken thighs"

### Mutation Check

Each mutant was applied to the real code, the suite run, and the code restored (verified byte-identical):

- ✅ **Key without note removal** (old key): 12 tests fail
- ✅ **Unit back in the key** (old split lines): 5 fail
- ✅ **No id ordering**: 1 fails (the shuffled-input test)
- ✅ **Label lowercased**: 5 fail
- ✅ **Empty-name fallback removed**: 2 fail
- ✅ **Leading prep words stripped** (the rule the catalog rejected): 4 fail
- ✅ **No singular/plural unit match**: 2 fail
- ✅ **"ss" and short units stripped**: 1 fails

Two mutants first reported as surviving had simply never been applied (a sed and a Python pattern
that didn't match). Both were re-applied with exact edits and caught. A surviving mutant is only
evidence once it's confirmed to be in the file.

### Acceptance Criteria Validation

- ✅ **"chicken thighs" + "chicken thighs, cubed" → one line** (story 001)
- ✅ **"onion", "onion, diced", "onion, finely chopped" → one line** (story 001, as amended)
- ✅ **Case and whitespace don't split a line** (story 001)
- ✅ **"onion" / "onions" stay two lines** (story 001)
- ✅ **A prep word before the name is kept** (story 001, as amended)
- ✅ **No empty key** (story 001)
- ✅ **Look-alike pairs stay apart** (NFR-2)
- ✅ **1 lb + 1 lb → "2 lb"; 2 lb + 4 → "2 lb + 4"; tbsp/tsp unconverted** (story 002)
- ✅ **cups + cup summed** (story 002, as amended)
- ✅ **First-appearance amount order; shuffled input gives an identical list** (story 002, NFR-3)
- ✅ **Clipboard and row show the same amounts** (story 002)
- ✅ **Label without prep notes, first-appearance capitalization** (story 003)
- ✅ **Cooking view untouched**: no file outside `src/features/shopping-list/` changed (story 003)

### Issues Found

1. **Leading prep words named products, not prep** (found in the browser, fixed). The approved rule
   turned "diced tomatoes" into "tomatoes" and merged canned tomatoes into fresh ones; it also
   relabelled "shredded cheese", "crushed peanuts" and "grated Parmesan cheese". Product owner
   chose the comma-only rule. Requirements FR-1 and story 001 record the change.
2. **"4.5 cups + 4.5 cup"** (found in the browser, fixed). Singular and plural units were separate
   amounts. Product owner chose to treat them as one unit. FR-2 and story 002 record it.

### Notes

- **What the catalog now merges**: bell pepper, bell peppers, carrot, carrots, onion (4 variants),
  sweet potatoes, chicken breast (6 variants, including "cooked & shredded" and "thin-cut"),
  chicken thighs. Every merge is a comma-note variant.
- **Lines still showing two amounts** are different units: butter (17 tbsp + 0.33 cup), sesame oil,
  tomato sauce (2 cup + 1 can), carrots (4 cups + 2 each), diced tomatoes, romaine lettuce (2 heads
  - 4 cups), zucchini (2 each + 6 medium). That's FR-2 as approved: no conversion.
- **The rendered list wasn't seen with a real week**: the household's week isn't full, and picking
  dinners would have changed their plan. The catalog was run through the same `buildShoppingList`
  the page uses, read-only, in the signed-in app. The page test covers the rendered row.
- **Still open, for bolt 081**: a line looks up its aisle by `nameKey(line.name)`. For
  "chicken breast", placed only as "chicken breast, cubed", that lookup misses. Don't release 080
  without 081.
