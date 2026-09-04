---
stage: test
bolt: 049-clear-picks-ui
created: '2026-09-04T02:54:00Z'
---

## Test Report: 001-clear-picks-ui (bolt 049)

### Summary

- **Tests**: 222/222 passed (full suite) — 6 new
- **Suites**: 29 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean
- **Build**: `npm run build` clean
- No unhandled rejections (the failed-clear test's rejection is caught in `handleClear`)

### Test Files

- [x] `src/features/dinners/components/CatalogPage.test.tsx` — +6 in a `clear picks` describe:
  - clearing a 3-pick week calls `clearSelections('plan-id')` once and shows an undo bar
    reading "3 dinners cleared." with an "Undo" button
  - a 1-pick clear → "1 dinner cleared." (singular)
  - "Undo" calls `addSelection` `[['plan-id','1'],['plan-id','2'],['plan-id','3']]` (order
    asserted) and the bar disappears
  - picking another dinner after a clear hides the bar
  - locked plan → no "Clear picks" control and no undo bar
  - a rejected `clearSelections` → "Couldn't clear your picks, try again." and no bar
- [x] `ClearPicksControl.test.tsx` / `clear-selections.test.ts` from bolt 048 — unchanged,
      still green.

### Acceptance Criteria Validation

- ✅ **FR-2** — control is the header right-stack's 2nd child (badge, control, IconButton);
  hidden at 0 picks (empty `selectedDinnerIds`) and when locked; header layout unchanged
- ✅ **FR-7** — undo bar in the header-region slot, `aria-live="polite"`, singular/plural
  count; dismisses on Undo / pick-another / navigate-away (state unmounts); no timer
- ✅ **FR-8** — pick cards disabled while `clearSelections.isPending`; clear failure →
  "Couldn't clear your picks, try again." with no undo bar; undo failure →
  "Couldn't undo that, try again." with `clearedIds` retained; control + bar hidden on a
  locked plan
- ✅ **FR-9** — focus: open → "Keep" (bolt 048 test); `Escape` / "Keep" → back to "Clear
  picks" (trigger ref); cleared → "Undo" (`requestAnimationFrame`); `role="group"` +
  `aria-live` present
- ✅ **FR-10** — new `clear picks` describe + bolt-048 component/data tests; existing
  `CatalogPage` / `weekly-plan` suites green with additive assertions only
- ✅ **Regression** — `PlanPage.tsx` untouched; full suite 222/222

### Issues Found

- Initial run leaked an unhandled rejection from the failed-clear test — `handleClear` /
  `handleUndo` now wrap `mutateAsync` in `try/catch` (the react-query `isError` flag still
  drives the alert). Fixed; re-run clean.

### Notes

- OQ-1 verified by construction: `clearedIds` is `CatalogPage` state with no persistence, so
  there is nothing to test for navigation survival.
