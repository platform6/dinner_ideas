---
stage: plan
bolt: 049-clear-picks-ui
created: '2026-09-04T02:46:00Z'
---

## Implementation Plan: 001-clear-picks-ui (bolt 049)

### Objective

Compose bolt 048's `ClearPicksControl` + hooks into the full flow on `CatalogPage`: mount,
`clearedIds` state, undo bar, in-flight/error handling, focus/a11y, and tests. Stories
**003**, **004**, **005**, **006**.

### Deliverables

1. **`src/features/dinners/components/CatalogPage.tsx`**
   - Import `ClearPicksControl`, `useClearSelections`, `useRestoreSelections`; add `useRef`.
   - `const clear = useClearSelections(); const restore = useRestoreSelections();`
   - `const [clearedIds, setClearedIds] = useState<string[] | null>(null);`
   - `const undoRef = useRef<HTMLButtonElement>(null);`
   - `const isLocked = currentPlan.data?.locked_at != null;`
   - `handleClear()` → `const ids = await clear.mutateAsync(currentPlan.data ?? null);
setClearedIds(ids.length ? ids : null);` then `requestAnimationFrame(() =>
undoRef.current?.focus())`. Failure → `clear.isError` alert; `clearedIds` stays null.
   - `handleUndo()` → `const planId = currentPlan.data?.id; if (planId && clearedIds) await
restore.mutateAsync({ planId, dinnerIds: clearedIds }); setClearedIds(null);`
   - Mount `<ClearPicksControl key={[...selectedDinnerIds].sort().join(',')}
count={selectedDinnerIds.size} isClearing={clear.isPending} onClear={() => void
handleClear()} />` as the 2nd child of the right-hand header `HStack` (Badge, control,
     IconButton).
   - **Undo bar** — directly below the header `HStack`, before the `toggleSelection.isError`
     alert; shown when `clearedIds != null && !isLocked`: `HStack justify="space-between"`,
     `bg="paper.subtle"`, `1px line.subtle`, radius `field`, `mb={4}`, `aria-live="polite"`;
     `uiIcons.info` (15px) + `{n === 1 ? '1 dinner cleared.' : `${n} dinners cleared.`}` +
     `<Button ref={undoRef} variant="outline" size="sm" leftIcon={uiIcons.restore}
isLoading={restore.isPending} onClick={handleUndo}>Undo</Button>`.
   - **Error alert** — sibling of `toggleSelection.isError`: `(clear.isError ||
restore.isError)` → `Alert status="error"` with "Couldn't clear your picks, try again."
     / "Couldn't undo that, try again.".
   - **`selectionDisabled`** — add `|| clear.isPending` to the existing expression.
   - **Dismiss on pick-another** — wrap `onToggleSelect` to `setClearedIds(null)` before
     `toggleSelection.mutate(...)`.
   - Navigate-away is automatic (state unmounts with the page).

2. **`src/features/weekly-plan/components/ClearPicksControl.tsx`** — return focus to the
   "Clear picks" trigger after the pill dismisses (`Escape` or "Keep"): add a `triggerRef` +
   an effect that focuses it when `isConfirming` transitions true → false.

3. **`src/features/dinners/components/CatalogPage.test.tsx`** — extend the pick-3 `describe`:
   `mockedClearSelections` / reuse `mockedAddSelection`; in `beforeEach`
   `mockedClearSelections.mockResolvedValue(undefined)`. New tests:
   - clearing a 3-pick week calls `clearSelections('plan-id')` and shows an undo bar reading
     "3 dinners cleared."
   - singular: a 1-pick week → "1 dinner cleared."
   - "Undo" calls `addSelection` 3× in order (`mock.calls`) and the bar disappears
   - picking another dinner after a clear hides the undo bar
   - the control and the undo bar are absent when the plan is locked
   - a failed `clearSelections` shows "Couldn't clear your picks, try again." and no bar

### Acceptance Criteria

- [ ] Control is the header right-stack's 2nd child; hidden at 0 picks / locked; no reflow
- [ ] Clear → undo bar with correct singular/plural; Undo restores in order + hides bar;
      pick-another / navigate-away also hide it; no timer
- [ ] Pick cards disabled while `clear.isPending`; clear/undo failures → the right inline
      alert
- [ ] Focus: open → "Keep"; `Escape` / "Keep" → back to "Clear picks"; cleared → "Undo";
      undo bar `aria-live="polite"`
- [ ] `PlanPage.tsx` untouched; full suite green; `tsc -b`, `eslint`, `vite build` clean
