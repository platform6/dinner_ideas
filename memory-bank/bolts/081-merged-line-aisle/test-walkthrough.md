---
stage: test
bolt: 081-merged-line-aisle
created: '2026-09-24T19:01:17Z'
---

## Test Report: merged-line-aisle

### Summary

- **Tests**: 835/835 passed, 51 files (826 after bolt 080; 9 new). `tsc -b` and `eslint src --max-warnings=0` clean
- **Coverage**: no formal target. Each FR-4 rule and both callers are pinned by a test that a mutant was shown to break
- **Browser** (read-only, signed-in app, the household's store "My Store", 143 registry items): every line in the full-catalog list now resolves to a registry item. With the old label-only lookup, **10 lines had none**, so they lost their Move button and their aisle

### Test Files

- [x] `src/features/shopping-list/reorder.test.ts` - New `lineItem` suite: rule 1 (exact label wins, the deliberate case named), rule 2 (first placed source), rule 3 (first source with an item), no item at all, source matched by name key, the pick staying the same after a move, and a merged line sorting into its placed variant's aisle. The existing 12 tests pass unchanged
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` - New "a merged line" block in the move suite: "cheddar" + "cheddar, grated" (only the variant has an item, placed at the back wall) render one line, sort after onion, and open the sheet for "cheddar, grated". Moving it places that item, re-sorts the line to the front, and it stays checked while onion stays unchecked

### Mutation Check

Each edit was confirmed applied (the script refuses if the text isn't found), the suite run, and both files restored byte-identical:

- ✅ **Label-only lookup** (the pre-081 behaviour): 7 tests fail
- ✅ **No rule 2** (first source, placed or not): 1 fails
- ✅ **No rule 1** (exact label ignored): 1 fails
- ✅ **Sort uses the label only**: 2 fail
- ✅ **Page uses the label only**: 2 fail

### Acceptance Criteria Validation

- ✅ **Exact label wins** (story 001, rule 1)
- ✅ **Else first placed source** (story 001, rule 2)
- ✅ **Else first source with an item** (story 001, rule 3)
- ✅ **A placed variant with no plain-named item sorts into the variant's aisle** (story 001)
- ✅ **Both exist, only the variant placed: the exact name wins, and the test says so** (story 001)
- ✅ **Unmerged lines resolve as before**: the existing reorder and move tests pass unchanged (story 001)
- ✅ **A merged line's Move button opens the chosen item's sheet** (story 002)
- ✅ **A move re-sorts the merged line, and the same item stays chosen** (story 002)
- ✅ **A checked merged line stays checked across the move** (story 002)
- ✅ **`nameKey` still matches `items.name_key`** (existing test)

### Issues Found

None in the code. One tooling issue: bolt 080's dev server wasn't fully stopped. Stopping its task
ended the `npx` wrapper but left Vite running on port 5199, and this bolt's own start failed on
that port. The check ran against the leftover server, which serves the current files, so its
results stand. The process was then stopped by PID and the port confirmed free.

### Notes

- **Lines that now find an item** (label-only lookup found none): carrot, carrots, mini pretzels, dried thyme, celery ribs, garlic cloves, cooked chicken, firm tofu, flank steak, sushi-grade salmon. The last eight exist only as a comma-note spelling ("celery ribs, chopped"), so bolt 080's plain label would have cut them off from their registry item. This bolt is what makes 080 safe to release.
- **Rule 1's trade-off doesn't bite today**: the store has 2 explicitly placed items, and none is a merged variant. Every merged line's variants inherit the same category aisle.
- **Not checked on screen with a real week**: the week isn't full, and filling it would change the plan. Same read-only approach as bolt 080; the page tests cover the rendered behaviour.
