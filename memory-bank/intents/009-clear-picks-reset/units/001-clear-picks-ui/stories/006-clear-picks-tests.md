---
id: 006-clear-picks-tests
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
status: complete
priority: must
created: '2026-09-04T02:36:10Z'
assigned_bolt: 049-clear-picks-ui
implemented: true
---

# Story: 006-clear-picks-tests

## User Story

**As a** developer maintaining the catalog and weekly-plan features
**I want** the Clear Picks flow covered by tests
**So that** a future change can't silently break the confirm, the undo bar, or the ordering

## Acceptance Criteria

- [ ] **Given** `ClearPicksControl.test.tsx` (new), **When** it runs, **Then** it covers:
      renders the quiet "Clear picks" button at count 1–3; renders `null` at count 0; clicking
      it opens the confirm pill with "Clear all {count}?" (`role="group"` + the exact
      `aria-label`); `Escape` and "Keep" both dismiss without calling `onClear`; "Clear all"
      fires `onClear` exactly once; `isClearing` puts the spinner on "Clear all"; opening the
      pill focuses "Keep".
- [ ] **Given** `CatalogPage.test.tsx` (extended), **When** it runs, **Then** it covers:
      clearing empties the grid and shows the undo bar with the right singular/plural count
      ("1 dinner cleared." vs "3 dinners cleared."); "Undo" calls `useRestoreSelections` with
      the removed ids **in order** and hides the bar; picking another dinner hides the bar;
      the control is absent at 0 picks and when the plan is locked; a failed clear surfaces
      "Couldn't clear your picks, try again." and no undo bar.
- [ ] **Given** the data layer, **When** tested, **Then**: `clearSelections` issues one
      `delete().eq('weekly_plan_id', planId)` and throws on error; `useRestoreSelections`
      calls `addSelection` once per id, sequentially, in the original order (assert call
      order, not just count).
- [ ] **Given** the existing `CatalogPage` / `weekly-plan` suites, **When** they run, **Then**
      they stay green — only additive assertions; `PlanPage` and its per-selection `×` are
      untouched.

## Technical Notes

- Reuse `LockWeekControl.test.tsx` (bolt 043) as the structural template for
  `ClearPicksControl.test.tsx`.
- Spy on `useClearSelections` / `useRestoreSelections` (or their underlying `clearSelections`
  / `addSelection`) to assert call args and order rather than a full Supabase mock.
- `CatalogPage.test.tsx` already mocks `@/features/weekly-plan/api` and (since intent 011)
  `@/features/settings/api` — add `clearSelections` to the mock expectations.

## Dependencies

### Requires

- 001-clear-picks-control
- 002-clear-selections-hooks
- 003-catalog-mount-and-undo-bar
- 004-in-flight-and-error-handling
- 005-keyboard-and-a11y

### Enables

- None (last story of the unit)

## Edge Cases

| Scenario                                                       | Expected Behavior                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A test asserting the old "un-pick each card" as the only reset | None exists; no change needed                                                                  |
| Undo order assertion flakiness                                 | Assert `addSelection.mock.calls` sequence explicitly, not with `Promise.all`-tolerant matchers |

## Out of Scope

- E2E / browser tests
- Navigation-persistence tests (OQ-1 resolved "no" — nothing to persist)
