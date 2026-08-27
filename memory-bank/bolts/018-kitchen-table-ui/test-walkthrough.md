---
stage: test
bolt: 018-kitchen-table-ui
created: 2026-08-27T14:15:00Z
---

## Test Report: kitchen-table-ui (Cooking view restyle)

### Summary

- **Tests**: 124/124 passed (20 test files; `CookingViewPage.test.tsx` rewritten around the new
  expand/collapse model, net +1 test vs. before: 6 total)
- **Build**: `npx tsc -b` clean, `npx eslint .` clean, `npx vite build` succeeds
- **Live verification**: not possible — requires an authenticated session, same gap noted in
  bolts 015–017

### Test Files

- [x] `src/features/cooking-view/components/CookingViewPage.test.tsx` (rewritten) — collapsed
      state hides step text and shows cook-time/step-count; independent per-card expand/collapse
      (two cards open at once, one collapses without affecting the other); zero-step fallback shown
      once expanded; locked-plan steps unchanged once expanded
- [x] Remaining 19 pre-existing files — re-verified passing

### Acceptance Criteria Validation

**Story 010-cooking-view-restyle**

- ✅ Collapsed row: 44px thumb, Lora title, cook-time + step-count, `ChevronDown` — "shows each
  dinner collapsed..." test
- ✅ Expanded: `brand.50` fill, `ChevronUp`, step tiles with `stepIcon` — "expands only the
  tapped card..." test (asserts expanded step text renders); tile/icon layout itself isn't
  independently asserted (pure presentational layout, no new logic branch — same rationale used
  for the equivalent presentational claims in bolts 016/017)
- ✅ Independent per-card expand state — "expands only the tapped card, independently of the
  others" test: expands Tacos and Pasta simultaneously, then collapses Tacos and confirms Pasta
  stays open
- ✅ Zero-step fallback, restyled — "shows a fallback note..." test (now post-expand)

### Issues Found

None — this bolt's tests needed a full rewrite rather than incremental fixes, since the prior
page had no collapse/expand behavior at all (see the implementation walkthrough for why), but
every rewritten assertion passed on the first implementation; nothing broke a second time.

### Notes

This is the last of the original 6 documented screens (`010`); story `011` (Suppressed view)
was already completed in bolt `015`. Only `019-kitchen-table-ui` (Store Config restyle, a
Should-priority story) remains for this unit/intent. Same live-verification gap as every bolt
since `015` — worth a full walkthrough (Login → Catalog → This Week → Shopping List → Cooking)
once the user has credentials in hand.
