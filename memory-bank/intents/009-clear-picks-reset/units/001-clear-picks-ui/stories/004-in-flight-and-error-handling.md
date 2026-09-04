---
id: 004-in-flight-and-error-handling
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
status: complete
priority: must
created: '2026-09-04T02:36:10Z'
assigned_bolt: 049-clear-picks-ui
implemented: true
---

# Story: 004-in-flight-and-error-handling

## User Story

**As a** household member clearing or undoing my picks
**I want** the grid to stay consistent and failures to be recoverable
**So that** a slow network or an error never leaves the week in a weird half-state

## Acceptance Criteria

- [ ] **Given** the clear mutation is running, **When** the grid renders, **Then** the "Clear
      all" button shows `isLoading`, and the dinner-card pick buttons are disabled — by
      extending `CatalogPage`'s existing `selectionDisabled` expression with a
      `clearSelections.isPending` term (same reasoning as the existing
      `toggleSelection.isPending` guard).
- [ ] **Given** the clear mutation is running, **When** it has not resolved, **Then** the
      optimistic UI does **not** clear the cards — the grid updates only when the mutation
      resolves and `['weekly-plan','current']` refetches.
- [ ] **Given** the clear mutation fails, **When** it rejects, **Then** the page's existing
      `Alert status="error"` pattern shows in the header-region slot: **"Couldn't clear your
      picks, try again."** and `clearedIds` stays `null` (no undo bar for a clear that didn't
      happen).
- [ ] **Given** the undo (restore) mutation fails, **When** it rejects, **Then** the same
      alert shows **"Couldn't undo that, try again."** and `clearedIds` is left as-is so the
      user can retry Undo.
- [ ] **Given** the current plan is locked (`locked_at !== null`), **When** the catalog
      renders, **Then** the `ClearPicksControl` and the undo bar are both hidden (its shopping
      list has been sent; its picks are history) — `selectedDinnerIds` is already empty when
      locked, and the undo bar is additionally guarded by `!isLocked`.

## Technical Notes

- Reuse the `Alert status="error"` + `borderRadius="field"` + `mb={4}` shape already used for
  `toggleSelection.isError` / `setDinnerActive.isError`; only one error alert shows at a time
  in practice.
- `selectionDisabled` today (CatalogPage.tsx): `(size >= 3 && !has) || (toggleSelection
.isPending && variables?.dinnerId !== id)` → add `|| clearSelections.isPending`.

## Dependencies

### Requires

- 002-clear-selections-hooks
- 003-catalog-mount-and-undo-bar

### Enables

- 006-clear-picks-tests

## Edge Cases

| Scenario                                                 | Expected Behavior                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Clear succeeds but the refetch briefly lags              | Cards clear on refetch; "Clear all" spinner ends when the mutation (not the refetch) resolves   |
| Undo half-succeeds (some re-adds done) then errors       | Undo error alert; the partially-restored plan is what the refetch shows; user re-picks the rest |
| A real `toggleSelection` error and a clear error at once | The last-set error alert wins the single slot; acceptable                                       |

## Out of Scope

- Retry/backoff beyond "try again" (press again)
- The keyboard/focus flow (story 005)
