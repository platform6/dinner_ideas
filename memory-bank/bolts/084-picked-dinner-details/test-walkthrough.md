---
stage: test
bolt: 084-picked-dinner-details
created: '2026-10-18T22:49:05Z'
---

## Test Report: picked-dinner-details

### Summary

- **Tests**: 872/872 passed across 53 files (16 new, 2 new files)
- **Coverage**: not measured. The project sets no percentage target (coding-standards.md)

### Test Files

- [x] `src/features/dinners/components/IngredientList.test.tsx` - lines read `quantity unit name` in the order given. The empty state is "No ingredients recorded." with no list
- [x] `src/features/dinners/components/StepList.test.tsx` - steps in the order given. The empty state is "No steps recorded." with no list
- [x] `src/features/dinners/components/DinnerCard.test.tsx` - unedited. Its Details tests guard the catalog's rendering after the extraction
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` - 9 new. Phone (390px): collapsed with no fetch on load; ingredients before steps with no tags, only for the opened dinner; rows independent with several open; expand and remove independent; empty states; spinner, then error, with the page still usable; a past locked week expands; collapsed after a week change. Desktop (1280px): one expand opens all three, and one collapse closes all
- [x] `src/features/cooking-view/components/CookingViewPage.test.tsx` - 3 new. Ingredients are hidden until expanded and come from the one request; Ingredients, then its lines, then Steps, all before the first step; "No ingredients recorded." alongside the unchanged "No steps available for this dinner yet."

### Acceptance Criteria Validation

- ✅ **Shared lists render as the catalog did, with empty states**: list tests, plus `DinnerCard` tests unedited
- ✅ **Expand on every dinner, any week, with `aria-expanded` and labels**: phone, desktop and past-week tests
- ✅ **Ingredients then steps, loaded only when open, spinner and error, no tags**: PlanPage tests
- ✅ **Desktop opens and closes together; phone rows independent**: 1280px and 390px tests
- ✅ **Collapsed on load and after a week change; remove and expand independent**: PlanPage tests
- ✅ **Cook: one request, ingredients above steps, step text and styling unchanged**: CookingViewPage tests, with existing tests unchanged
- ✅ **Lint, typecheck, full suite; no `supabase/` change**: `eslint src --max-warnings=0`, `tsc -b`, `vitest run` clean; `git diff -- supabase/` empty
- ⏳ **Browser check at 390px and desktop**: deferred to the release smoke test (product owner, 2026-10-18). The Claude in Chrome extension was not connected

### Issues Found

None in the code.

### Notes

jsdom has no layout, so whether the phone row fits both buttons at 390px, and how three open
desktop cards look, are only covered by the browser check.
