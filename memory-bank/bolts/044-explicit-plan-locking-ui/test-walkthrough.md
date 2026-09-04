---
stage: test
bolt: 044-explicit-plan-locking-ui
created: '2026-09-04T00:55:00Z'
---

## Test Report: 001-explicit-plan-locking-ui (bolt 044)

### Summary

- **Tests**: 190/190 passed (full suite)
- **Suites**: 26 passed
- **Type check**: `tsc -b` clean
- **Lint**: `eslint` clean on changed files
- **Build**: `npm run build` clean

### Test Files

- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` — updated: removed
      `lockPlan` mock wiring; "copies the list and never locks — no checkbox exists" (Copy →
      `writeText` with the list text, plain "Copied!", `queryByRole('checkbox', /also lock/)`
      is null); "shows a non-blocking 'not locked in yet' note" (link → `/plan`; Copy still
      succeeds); "hides the note once the plan is locked; copy shows plain 'Copied!'". Kept:
      gate message, grouped-list, clipboard-fallback.
- [x] Bolt 043's `LockWeekControl.test.tsx` + `PlanPage.test.tsx` extensions carry the
      `/plan` lock-flow coverage — unchanged and still green.

### Acceptance Criteria Validation

- ✅ **FR-4** — `ShoppingListPage` has no `useLockPlan` import; `handleCopy` only writes to the
  clipboard; the "Also lock this week's plan" checkbox is gone from both layouts; success
  text is plain "Copied!"; manual-copy fallback has no lock fragment
- ✅ **FR-5** — the "This week isn't locked in yet — lock it on This Week" note shows for an
  unlocked plan, links to `/plan` via `RouterLink`, is neutral-styled, and never blocks
  copying; absent once locked
- ✅ **FR-7** — ShoppingListPage tests updated to the decoupled behaviour; whole suite green
  (190/190); `LockWeekControl` + `PlanPage` coverage from bolt 043 intact
- ✅ **Regression** — `weekly-plan`, `dinners`, `cooking-view`, `store-config`, `settings`,
  `auth` suites unchanged and green

### Issues Found

None.

### Notes

- Suite count moved 191 → 190: three lock-coupled ShoppingListPage tests removed, two added
  (net −1). The removed behaviour (copy-locks-by-default) no longer exists.
- `meal_history` on lock is unaffected — the trigger fires on the `locked_at` transition
  regardless of which page calls `lock_weekly_plan`, and the only caller is now
  `LockWeekControl` on `/plan` (bolt 043).
