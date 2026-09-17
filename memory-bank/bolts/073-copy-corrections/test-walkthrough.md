---
stage: test
bolt: 073-copy-corrections
created: '2026-09-17T16:17:56Z'
---

## Test Report: copy-corrections

### Summary

- **Tests**: 735/735 passed across 46 files (was 725 before this bolt; +10)
- **Coverage**: not measured. The coding standards set no percentage target, and this bolt's risk
  is copy regressing, which the tests below pin directly.
- `tsc -b` and `eslint src --max-warnings=0` pass. All changed and new files pass Prettier.

### Test Files

- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` - `fetchDinnersPerWeek` is now set
      explicitly in `beforeEach` (3). New: lock help text and all-picked message rendered at 1, 3
      and 5 per week; no "3 dinners" or "three" in the page at 5; "Lock in this dinner?" at 1. The
      old `/all three picked/i` assertion now expects "All 3 dinners picked. Your shopping list is
      ready."
- [x] `src/features/weekly-plan/components/LockWeekControl.test.tsx` - new: a single pick is
      confirmed as "Lock in this dinner?" and never "these 1"
- [x] `src/features/dinners/components/CatalogPage.test.tsx` - new: both add links (phone icon and
      md+ text) are named "Add a dinner" and point to `/dinners/new`; no "Add dinner" text renders
- [x] `src/features/dinners/add-a-dinner-wording.test.ts` - new source guard: reads every
      non-test `src/**/*.tsx` file, checks that its matcher catches JSX text and string literals
      but not comments, and fails if any file contains user-facing "Add dinner"

### Regression proof

The old copy was temporarily reintroduced ("Add dinner" in `CatalogPage.tsx`, the hard-coded
"Locks these 3 dinners" in `PlanPage.tsx`), and the fixed source was then restored. **Exactly the
four tests meant to catch it failed**:

- the source guard
- the catalog "Add a dinner" links test
- the 5-per-week lock help test
- the "no '3 dinners' or 'three' at 5" test

The 1- and 3-per-week cases still passed against the mutant, as expected: 1 takes the singular
branch, and 3 is the value the old string happened to match. That is the blind spot the original
tests had.

### Acceptance Criteria Validation

- ✅ **At 5 per week**: "Locks these 5 dinners and adds them to your history…" and "All 5 dinners
  picked. Your shopping list is ready."
- ✅ **At 1 per week**: "Locks this dinner and adds it to your history…", "Your dinner is picked.
  Your shopping list is ready.", and "Lock in this dinner?" after "Lock in this week"
- ✅ **At 3 per week**: "Locks these 3 dinners…" and "All 3 dinners picked…"
- ✅ **At 5 per week, no "3 dinners" or "three"** in the rendered page
- ✅ **Comments** in `DinnerCard.tsx` and `PlanPage.tsx` no longer describe the count as 3
- ✅ **The md+ catalog button reads "Add a dinner"**; the phone aria-label and page heading are
  unchanged
- ✅ **The guard test** fails on reintroduced "Add dinner" and passes on the fixed source
- ✅ **`pnpm test`, `tsc -b`, `eslint`** pass

### Issues Found

None in this bolt's scope.

`prettier --check src` reports files outside this bolt with style differences (41 before this
bolt's changes, 34 with them). This predates the bolt, most likely line endings on this Windows
checkout, since the pre-commit hook formats staged files. Not addressed here.

### Notes

- jsdom applies no media queries, so both the phone and md+ add links render in tests. The
  catalog test asserts both rather than relying on one being hidden.
- Not verified in a browser. This bolt changes copy only, and the rendered-text tests cover it. The
  layout bolts (075, 076) are the ones that need a real viewport.
