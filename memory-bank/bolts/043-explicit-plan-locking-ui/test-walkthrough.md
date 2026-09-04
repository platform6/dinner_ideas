---
stage: test
bolt: 043-explicit-plan-locking-ui
created: '2026-09-04T00:45:00Z'
---

## Test Report: 001-explicit-plan-locking-ui (bolt 043)

### Summary

- **Tests**: 191/191 passed (full suite) — 11 new for this bolt
- **Suites**: 26 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean on all changed files
- **Build**: `npm run build` (`tsc -b && vite build`) clean (pre-existing chunk-size warning
  only)

### Test Files

- [x] `src/features/weekly-plan/components/LockWeekControl.test.tsx` — new (7 tests): renders
      nothing below 3 selections; renders the button at 3; opening the confirm shows the
      `role="group"` pill with the exact copy and `aria-label` and moves focus to "Keep
      editing"; "Keep editing" and `Escape` both dismiss without calling `onLock`; "Lock it
      in" calls `onLock` once; `isLocking` puts the loading state on the idle button.
- [x] `src/features/weekly-plan/components/PlanPage.test.tsx` — extended (+4 tests, 1 updated):
      "pick 3" prompt at 1–2 picks; "Lock in this week" + context line at 3 picks on the
      current unlocked week; locking through the inline confirm calls `lockPlan('plan-id')`
      exactly once; a rejected `lockPlan` surfaces the inline "Couldn't lock this week, try
      again." alert; the locked-state test now also asserts the reworded banner and the
      absence of the lock button.

### Acceptance Criteria Validation

- ✅ **FR-1 visibility** — button only at `isCurrentWeek && !isLocked && selections.length === 3`;
  absent on locked and (by construction) past weeks
- ✅ **FR-6 helper states** — "Pick 3 dinners to lock in your week." at 1–2 picks; context
  line at 3; existing 0-pick empty state untouched
- ✅ **FR-2 inline confirm** — `role="group"` + `aria-label="Confirm locking this week's plan"`;
  focus to "Keep editing"; `Escape` / "Keep editing" dismiss; "Lock it in" fires the mutation
  once; spinner while pending
- ✅ **FR-2 failure path** — inline `Alert` "Couldn't lock this week, try again."; control
  returns to idle
- ✅ **FR-3 reword** — "This week's plan is locked in — saved to your history." with a
  `formatWeekRange` eyebrow; read-only behaviour (no remove buttons) unchanged
- ✅ **Regression** — all pre-existing `weekly-plan`, `shopping-list`, `dinners`,
  `cooking-view`, `settings`, `auth` suites green (191/191)
- ⏭️ **"Next week opens {date}" line (FR-3, Could)** — intentionally deferred to intent 011
  (no feature to gate on); not asserted

### Issues Found

None. One test-authoring fix during the run: `toBeEmptyDOMElement()` on the render container
failed because `ChakraProvider` injects a hidden `<span id="__chakra_env">`; switched to
asserting the control's own output (`queryByRole('button' | 'group')`) is absent.

### Notes

- Full `LockWeekControl` + `PlanPage` coverage lives here rather than being deferred to bolt
  044's story 006 — 044's test story is now the ShoppingListPage decoupling coverage plus a
  final cross-page sweep.
- The `ShoppingListPage.test.tsx` "copies and locks by default" test still passes — that
  coupling is removed in bolt 044.
