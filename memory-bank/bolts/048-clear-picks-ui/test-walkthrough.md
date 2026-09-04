---
stage: test
bolt: 048-clear-picks-ui
created: '2026-09-04T02:45:00Z'
---

## Test Report: 001-clear-picks-ui (bolt 048)

### Summary

- **Tests**: 216/216 passed (full suite) — 10 new
- **Suites**: 29 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean
- **Build**: `npm run build` clean

### Test Files

- [x] `src/features/weekly-plan/components/ClearPicksControl.test.tsx` — new (7): `null` at
      count 0; "Clear picks" button at 1–3; opening the confirm shows "Clear all 3?" with
      `role="group"` + the exact `aria-label` and focuses "Keep"; `Escape` and "Keep" both
      dismiss without `onClear`; "Clear all" fires `onClear` once; `isClearing` → the idle
      button shows `data-loading`.
- [x] `src/features/weekly-plan/clear-selections.test.ts` — new (3): `useClearSelections`
      returns the plan's dinner ids in order and calls `clearSelections('plan-1')`; a `null`
      plan returns `[]` with no delete; `useRestoreSelections` calls `addSelection` once per
      id, in order (`mock.calls` asserted exactly).

### Acceptance Criteria Validation

- ✅ **FR-1** — state matrix (0 / 1–3 / confirming); "Clear all" → `onClear` once; spinner
  while clearing; focus-to-"Keep"; `Escape` / "Keep" dismiss; no animation
- ✅ **FR-1** — "Clear all" is the only filled `heart.500` button (call-site props); "Keep"
  is the heart-tinted outline; no `danger` theme variant added
- ✅ **FR-4** — `clearSelections` = one `.delete().eq('weekly_plan_id', …)`, throws on error,
  leaves the plan row, idempotent (RLS handles cross-household)
- ✅ **FR-5** — `useClearSelections` returns removed ids in selection order + invalidates
  `currentPlanKey`; not built on `useToggleSelection`
- ✅ **FR-6** — `useRestoreSelections` re-adds sequentially in order + invalidates
  `currentPlanKey`
- ✅ **Regression** — full suite 216/216; `weekly-plan`, `dinners`, `settings`, etc. green

### Issues Found

None.

### Notes

- The `CatalogPage` integration (mount, undo bar, error alerts, focus-to-"Undo",
  `selectionDisabled`) and its tests are bolt 049 (stories 003–006).
- Spinner rides the idle "Clear picks" button (not "Clear all") — deliberate, matches
  `LockWeekControl`; see implementation-walkthrough.
