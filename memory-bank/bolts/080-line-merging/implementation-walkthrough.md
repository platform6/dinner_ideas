---
stage: implement
bolt: 080-line-merging
created: '2026-09-24T15:03:00Z'
---

## Implementation Walkthrough: line-merging

### Summary

The shopping list now merges ingredient lines by name with prep notes removed, and a line carries one
amount per unit instead of a single quantity. The on-screen row and the clipboard share one amounts
formatter. The build visits dinners and ingredients in id order, so the same week always gives the
same list.

### Structure Overview

The merge rule lives in its own module, next to (but separate from) `nameKey`, which has to keep
matching the database. `aggregate.ts` uses the rule to group lines; `format.ts` owns how amounts are
written; the page renders them. Nothing outside `src/features/shopping-list/` changed.

### Completed Work

- [x] `src/features/shopping-list/merge-key.ts` - New. The merge key, the plain label and the unit key
- [x] `src/features/shopping-list/types.ts` - A line now has a list of amounts and its source names, instead of one quantity and unit
- [x] `src/features/shopping-list/aggregate.ts` - Merges on the merge key, sums per unit key, records source names, visits in id order
- [x] `src/features/shopping-list/format.ts` - New `formatAmounts`, used by the clipboard text
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` - The row shows `formatAmounts`; the check-state key is category + name

### Key Decisions

- **Label and key share one function**: the key is the label lowercased, so a line's name and its merge key can't disagree. That's what makes category + name a safe check-state key.
- **Source names are the raw names, deduplicated exactly**: "Onion" and "onion" are both kept, so bolt 081 can match each against the registry by `nameKey`.

### Deviations from Plan

Two changes, both made in Stage 3 after the household's catalog showed them, and both decided by the
product owner:

- **Only the note after the first comma is removed.** The plan also removed prep words anywhere in
  the name. In the catalog, a prep word before the name names the product ("diced tomatoes" is a
  can, "shredded cheese" is a bag), and canned diced tomatoes merged into fresh tomatoes. `PREP_WORDS`
  and its pattern were removed.
- **A unit's singular and plural are one unit** (`unitKey`): the catalog showed "4.5 cups + 4.5 cup"
  on one line. A trailing "s" is dropped for units longer than two letters, except after "ss".
  Nothing is converted.

### Dependencies Added

None.

### Developer Notes

- Three existing test files (`aggregate.test.ts`, `format.test.ts`, `reorder.test.ts`) build lines in the old shape and don't type-check yet. They're updated in Stage 3 with the new tests.
- `reorder.ts` and the page's `itemByNameKey` still look a line up by `nameKey(line.name)`. That's bolt 081.
