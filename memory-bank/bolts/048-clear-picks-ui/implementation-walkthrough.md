---
stage: implement
bolt: 048-clear-picks-ui
created: '2026-09-04T02:44:00Z'
---

## Implementation Walkthrough: 001-clear-picks-ui (bolt 048)

### Summary

Built the `ClearPicksControl` component (quiet "Clear picks" button → inline "Clear all {n}?"
confirm) and the data layer: `clearSelections` (one keyed `delete`), `useClearSelections`
(returns the removed dinner ids in order), and `useRestoreSelections` (sequential re-add for
Undo). No schema, no new dependency.

### Structure Overview

`ClearPicksControl` is a structural clone of `LockWeekControl` (intent 012) — three
prop-driven states, local-only `isConfirming`, parent owns the mutation. `useClearSelections`
snapshots `dinner_id`s from the passed plan before the delete so the caller can build an undo
list without re-reading the emptied plan. Both hooks invalidate the module-private
`currentPlanKey`, which is the prefix of the week-aware key from intent 011.

### Completed Work

- [x] `src/features/weekly-plan/components/ClearPicksControl.tsx` — new: `null` at count 0;
      quiet `Button` "Clear picks" (`uiIcons.restore`) idle; inline `HStack` pill
      (`role="group"`, `aria-label="Confirm clearing this week's picks"`) with "Clear all
      {count}?", a heart-tinted-outline **Keep**, and the single call-site terracotta **Clear
      all** (`heart.500/600/700`, `color="paper.base"`). Focus → "Keep" on open; `Escape`
      dismisses. The clear spinner rides the idle button (see Key Decisions).
- [x] `src/features/weekly-plan/api.ts` — `clearSelections(planId)` =
      `.delete().eq('weekly_plan_id', planId)`, throws on error, leaves the plan row.
- [x] `src/features/weekly-plan/hooks.ts` — `useClearSelections()` (mutationFn takes the plan,
      reads ids first, deletes, returns ids; `null` → `[]`) and `useRestoreSelections()`
      (awaited `for` loop over `addSelection`, not `Promise.all`). Both invalidate
      `currentPlanKey` on success.
- [x] `src/features/weekly-plan/components/ClearPicksControl.test.tsx` — new (7 tests),
      mirrors `LockWeekControl.test.tsx`.
- [x] `src/features/weekly-plan/clear-selections.test.ts` — new (3 tests), `renderHook` +
      QueryClient wrapper: `useClearSelections` returns `['a','b','c']` and calls
      `clearSelections('plan-1')`; `null` plan → `[]`, no call; `useRestoreSelections` calls
      `addSelection` `[['plan-1','a'],['plan-1','b'],['plan-1','c']]` — order asserted.

### Key Decisions

- **Clear spinner on the idle button, not "Clear all"** — FR-1 says "Clear all" click runs
  `setIsConfirming(false)` _then_ `onClear()`, which closes the pill immediately, so a spinner
  on "Clear all" would never be visible. Matches `LockWeekControl`'s resolution of the same
  spec tension. Noted as a deliberate deviation.
- **`useClearSelections` takes the plan object** (not just an id) so it can read the
  selection order in the same call — the caller passes `currentPlan.data`.
- **`clear-selections.test.ts` via `renderHook`** rather than a Supabase chain mock — asserts
  call args/order at the hook boundary (coding-standards: mock at the boundary).

### Deviations from Plan

- Spinner placement (above). Otherwise none.

### Dependencies Added

None.

### Developer Notes

- Bolt 049 wires `onClear` → `useClearSelections().mutate(currentPlan.data)` and holds the
  returned ids in `CatalogPage`'s `clearedIds` for the undo bar.
- `heart` ramp (`50/100/200/500/600/700`) has every value FR-1 needs; no token added.
