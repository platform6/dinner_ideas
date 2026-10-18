---
stage: implement
bolt: 081-merged-line-aisle
created: '2026-09-24T18:47:56Z'
---

## Implementation Walkthrough: merged-line-aisle

### Summary

A shopping-list line now finds its registry item by FR-4's rules instead of by its label alone, so a
merged line sorts into, and moves, the aisle of the variant the household actually placed. The sort
and the page's Move button go through the same function.

### Structure Overview

`reorder.ts` already owned the one question "which registry item is this line?" (`nameKey`). It now
also owns the answer for merged lines: an index of items by name key, and `lineItem`, which applies
the rules. `reorderGroupsByLocation` and `ShoppingListPage` both call it.

### Completed Work

- [x] `src/features/shopping-list/reorder.ts` - Adds `indexByNameKey` and `lineItem` (FR-4: exact label, else first placed source, else first source with an item); the group sort uses `lineItem` for each line's position
- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` - The Move button and the sheet take their item from `lineItem`, replacing the label-only lookup

### Key Decisions

- **One function, two callers, not a field on the line**: building the list has no registry data, and adding it would tie a pure merge to server state. Both callers use the same function instead, so the rule is written once.
- **The sheet keeps the moved item's own name**: approved at the plan checkpoint. A merged "chicken breast" line can open "Where do you find it: chicken breast, cubed", because that's the item being placed.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- The pick is stable across a move from the list. The moved item becomes `placed`, and each rule then picks it again. Stage 3 tests the rule-3 path, where that matters.
- The existing 71 shopping-list tests pass unchanged, including the move suite.
