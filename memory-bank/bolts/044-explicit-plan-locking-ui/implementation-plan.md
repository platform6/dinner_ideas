---
stage: plan
bolt: 044-explicit-plan-locking-ui
created: '2026-09-04T00:45:00Z'
---

## Implementation Plan: 001-explicit-plan-locking-ui (bolt 044)

### Objective

Finish the decoupling: `ShoppingListPage` no longer locks anything (Copy just copies), a
non-blocking "not locked yet" note points to `/plan`, and the ShoppingListPage tests are
updated to the new behaviour.

Stories: **004-shopping-list-lock-decoupled** (FR-4), **005-not-locked-yet-nudge** (FR-5),
**006-lock-flow-tests** (FR-7 — the ShoppingListPage half + cross-page sweep;
`LockWeekControl` + `PlanPage` coverage already landed in bolt 043).

### Deliverables

1. **`src/features/shopping-list/components/ShoppingListPage.tsx`**
   - Remove: `useLockPlan` import + call; `lockChecked` / `shouldLock` state; `lockErrorMessage`
     state + its `Alert` block; the `lockPlan.mutateAsync` block in `handleCopy`; the
     `lockCheckbox` element and both its placements.
   - Keep a `const isLocked = plan?.locked_at != null;` (was `isAlreadyLocked`) for the nudge.
   - `handleCopy` = set copying, clear outcome, write clipboard, set outcome, done.
   - Success copy → plain `Copied!` (drop the `shouldLock ? … : …` branches in the success
     alert and the manual-copy fallback text).
   - Add `lockNudge`: `!isLocked` → a `Text textStyle="meta"` (neutral colour, no red) —
     _"This week isn't locked in yet — [lock it on This Week](/plan) to save it to your
     history."_ Rendered directly after `copyButton` in **both** the md+ header block and the
     phone sticky footer (mirrors how `lockCheckbox` was dual-placed).

2. **`src/features/shopping-list/components/ShoppingListPage.test.tsx`**
   - Drop `lockPlan` import + `mockedLockPlan` + its `beforeEach` stub.
   - Rewrite the three lock-coupled tests:
     - "copies the list and never locks" — Copy → `writeText` called, plain `Copied!`, and (no
       lock mock exists) the page has no "also lock" checkbox.
     - "shows the not-locked-yet nudge for an unlocked week; copy still succeeds" — nudge link
       to `/plan` present; Copy still shows `Copied!`.
     - "hides the nudge once the plan is locked; copy shows plain Copied!" — locked plan → no
       nudge, no checkbox, `Copied!`.
   - Keep: gate message, grouped-list, clipboard-fallback tests (fallback text no longer has a
     lock fragment but the assertion `/couldn.t copy automatically/i` still matches).

### Dependencies

- Bolt 043 (done) — `uiIcons.lock`/`locked` already present; `/plan` lock action exists to
  point at.
- No RPC/schema/deps change.

### Technical Approach

Pure deletion + simplification in `ShoppingListPage`; the nudge is one prop-free element
reused in the two existing action containers. `useCurrentPlan` already exposes `locked_at`.

### Acceptance Criteria

- [ ] `ShoppingListPage` has no `useLockPlan` import; `handleCopy` only writes to the
      clipboard; no mutation of any kind
- [ ] Success text is `Copied!` with no lock-state variants; manual-copy fallback has no lock
      fragment
- [ ] The "also lock this week's plan" checkbox is gone from both layouts
- [ ] `lockNudge` shows for an unlocked (3-pick, current-week) plan and is absent when locked;
      it is neutral-styled and links to `/plan` via `RouterLink`; Copy still succeeds
- [ ] `ShoppingListPage.test.tsx` updated; full suite green; `tsc -b`, `eslint`, `vite build`
      clean
