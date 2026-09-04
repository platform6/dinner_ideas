---
stage: implement
bolt: 044-explicit-plan-locking-ui
created: '2026-09-04T00:52:00Z'
---

## Implementation Walkthrough: 001-explicit-plan-locking-ui (bolt 044)

### Summary

Removed every trace of locking from `ShoppingListPage`: Copy now only writes to the
clipboard, the "Also lock this week's plan" checkbox and its state/error handling are gone,
and success text is a plain "Copied!". Added a neutral, non-blocking "This week isn't locked
in yet" note that links to `/plan`, shown only for an unlocked plan. Updated the
ShoppingListPage tests to the decoupled behaviour.

### Structure Overview

`ShoppingListPage` lost its `useLockPlan` dependency and three pieces of state
(`lockChecked`, `shouldLock`, `lockErrorMessage`); `handleCopy` collapsed to clipboard-write
plus outcome. A single `lockNudge` element (rendered when `!isLocked`) replaces the old
`lockCheckbox` in the two existing action containers — the md+ header stack and the phone
sticky footer — so the page keeps its one responsive control region, now just Copy + the
pointer to This Week.

### Completed Work

- [x] `src/features/shopping-list/components/ShoppingListPage.tsx` — dropped the `useLockPlan`
      import/call; removed `lockChecked` / `shouldLock` / `lockErrorMessage` and the lock
      branch in `handleCopy`; deleted the `lockCheckbox` element and the `lockErrorMessage`
      alert; success alert is now plain "Copied!" and the manual-copy fallback text lost its
      lock fragment; added `lockNudge` (`!isLocked` → `Text` + `RouterLink` to `/plan`, neutral
      `ink.400`, no error styling) after `copyButton` in both the header and sticky-footer
      layouts; kept `isLocked` (renamed from `isAlreadyLocked`) purely to gate the nudge.
- [x] `src/features/shopping-list/components/ShoppingListPage.test.tsx` — removed the
      `lockPlan` import, `mockedLockPlan`, and its `beforeEach` stub; replaced the three
      lock-coupled tests with: "copies the list and never locks — no checkbox exists",
      "shows a non-blocking 'not locked in yet' note linking to This Week", and "hides the
      note once the plan is locked; copy still shows plain 'Copied!'". Kept the gate,
      grouped-list, and clipboard-fallback tests.

### Key Decisions

- **Nudge placement** mirrors the old `lockCheckbox`: rendered in both action containers so
  it sits with the Copy button in whichever layout is active, rather than floating in the
  list body.
- **`isLocked` kept** (not fully removed) — the nudge needs to disappear once the week is
  locked; that is its only remaining use in this file.
- **No new error surface** — copy failure keeps its existing selectable-textarea fallback;
  there is simply no lock to fail anymore.

### Deviations from Plan

None.

### Dependencies Added

None. One import removed (`useLockPlan`).

### Developer Notes

- In the test env `useBreakpointValue` resolves to `base` (`actionsInHeader = false`), so the
  sticky-footer layout renders and holds the single Copy button + nudge — assertions are
  unambiguous.
- `Checkbox` is still imported and used for the per-item "got it in the store" checkboxes;
  only the lock checkbox was removed.
