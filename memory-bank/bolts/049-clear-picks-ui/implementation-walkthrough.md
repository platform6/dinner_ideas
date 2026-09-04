---
stage: implement
bolt: 049-clear-picks-ui
created: '2026-09-04T02:52:00Z'
---

## Implementation Walkthrough: 001-clear-picks-ui (bolt 049)

### Summary

Wired bolt 048's `ClearPicksControl` + hooks into `CatalogPage`: the control sits in the
header between the count badge and the "Not interested" button; `CatalogPage` owns
`clearedIds` and renders a parent-owned undo bar; clearing disables the pick cards; clear/undo
failures show a short inline alert; focus moves Keep → trigger / cleared → Undo. `/plan` is
untouched.

### Structure Overview

`handleClear` / `handleUndo` on `CatalogPage` drive `useClearSelections` / `useRestoreSelections`
(bolt 048); the clear mutation's returned dinner-id list becomes `clearedIds`, which is
`CatalogPage` state only — leaving the page drops it (OQ-1). The undo bar reuses the
`toggleSelection.isError` header-region slot and is guarded `clearedIds != null && !isLocked`.
`ClearPicksControl` gained a trigger ref so `Escape` / "Keep" return focus to the "Clear
picks" button, while "Clear all" leaves focus for the parent to move to "Undo".

### Completed Work

- [x] `src/features/dinners/components/CatalogPage.tsx`
  - `useClearSelections` / `useRestoreSelections`; `clearedIds` state + `undoRef`; `isLocked`.
  - `handleClear` (try/catch — `isError` alert handles failure; `requestAnimationFrame` focus
    to "Undo" on success); `handleUndo` (restores then clears `clearedIds`; keeps it on error
    for retry).
  - `<ClearPicksControl>` mounted as the 2nd header-right child, `key` on the sorted
    selection set so a pick change remounts it to idle.
  - Undo bar: `HStack` `bg="paper.subtle"` `1px line.subtle` radius `field` `mb={4}`
    `aria-live="polite"`; `uiIcons.info` + "{n} dinner(s) cleared." (singular at 1) + an
    outline "Undo" button (`uiIcons.restore`, `isLoading` while restoring).
  - Error alert: `(clearSelections.isError || restoreSelections.isError)` → "Couldn't clear
    your picks…" / "Couldn't undo that…".
  - `selectionDisabled` gains `|| clearSelections.isPending`; `onToggleSelect` now
    `setClearedIds(null)` before the toggle (dismiss-on-pick-another).
- [x] `src/features/weekly-plan/components/ClearPicksControl.tsx` — `triggerRef` +
      `closedByClear` ref; effect returns focus to the trigger on an Escape/"Keep" dismiss (not
      on "Clear all").
- [x] `src/features/dinners/components/CatalogPage.test.tsx` — +6 tests in a new
      `clear picks` describe: keyed delete on `'plan-id'` + plural undo bar; singular at 1; Undo
      re-adds in order (`mock.calls` asserted) and hides the bar; picking another dinner hides the
      bar; no control/bar when locked; a failed clear shows the alert and no bar.

### Key Decisions

- **Undo bar guarded `!isLocked` in addition to `clearedIds != null`** — belt-and-suspenders;
  a clear can't happen on a locked plan (control hidden) but a stale `clearedIds` + a
  cross-tab lock shouldn't show the bar.
- **`try/catch` in `handleClear` / `handleUndo`** — `mutateAsync` rejects on failure; without
  the catch the `() => void handle…()` call leaks an unhandled rejection (the react-query
  `isError` flag still drives the alert). Same pattern as `PlanPage#handleLock`.
- **Focus choreography split** — `ClearPicksControl` owns Keep/Escape → trigger; `CatalogPage`
  owns cleared → "Undo" (via `requestAnimationFrame`, after the bar mounts).

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- Navigate-away persistence is nil by construction — `clearedIds` unmounts with `CatalogPage`.
- The undo bar and the at-capacity `Alert` never co-exist in practice (bar needs count 0,
  banner needs count ≥ 3).
