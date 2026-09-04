---
stage: plan
bolt: 043-explicit-plan-locking-ui
created: '2026-09-04T00:23:20Z'
---

## Implementation Plan: 001-explicit-plan-locking-ui (bolt 043)

### Objective

Give `/plan` (This Week) a deliberate, guarded **"Lock in this week"** action with an inline
confirm, add the `/plan` helper-line states, and reword the locked banner — reusing the
existing `lock_weekly_plan` RPC and `useLockPlan` hook. No schema, no backend, no new
dependency (`uiIcons.locked` already exists = Lucide `Lock`).

Stories in scope: **001-lock-in-this-week-action** (FR-1, FR-6), **002-inline-lock-confirm**
(FR-2), **003-locked-view-reword** (FR-3). ShoppingListPage decoupling + nudge + the
consolidated test sweep are **bolt 044** — not here.

### Deliverables

1. **`src/features/weekly-plan/components/LockWeekControl.tsx`** — new, prop-driven
   presentational control:
   - Props: `{ selectionCount: number; onLock: () => void; isLocking?: boolean }`
   - Owns only `isConfirming: boolean` local state
   - `selectionCount < 3` → renders `null`
   - not confirming → a single button **"Lock in this week"**, `leftIcon={uiIcons.locked}`,
     `variant="solid" size="sm"` (primary but modest — matches the header scale)
   - confirming → an inline `HStack` pill, `role="group"`,
     `aria-label="Confirm locking this week's plan"`: text _"Lock in these 3? You won't be
     able to change this week's picks."_ (live count, `whiteSpace="nowrap"` on the label),
     a **"Keep editing"** button (`variant="quiet" size="sm"`) and a **"Lock it in"** button
     (`variant="solid" size="sm"`, `isLoading={isLocking}`)
   - "Lock it in" click → `setIsConfirming(false)` then `onLock()`
   - opening the pill moves focus to **"Keep editing"** (ref + `useEffect` on `isConfirming`)
   - `Escape` while confirming → `setIsConfirming(false)` (keydown handler on the pill)
   - no transition/animation on the swap
   - a `resetConfirm()` imperative escape hatch is **not** needed — see the parent's
     `key`-reset approach below

2. **`src/features/weekly-plan/components/PlanPage.tsx`** — wire it in:
   - Load `useLockPlan()`; keep `plan.id` from `week.data`
   - New block **directly below the header `HStack`** (after line ~92), before the
     `toggleSelection.isError` alert — the "page-level action for this week" region:
     - `isCurrentWeek && !isLocked && selections.length >= 1 && selections.length < 3` →
       helper `Text textStyle="faint"`: _"Pick 3 dinners to lock in your week."_
     - `isCurrentWeek && !isLocked && selections.length === 3` → `<LockWeekControl
selectionCount={3} isLocking={lockPlan.isPending} onLock={handleLock} />` plus a
       context line _"Locks these 3 dinners and adds them to your history. You can still shop
       your list either way."_
   - `handleLock`: `await lockPlan.mutateAsync(plan.id)`; on resolve move focus to the page
     `<h1>` (ref); errors handled by the mutation's `isError` (below)
   - Dismiss-on-pick-change: pass `key={`lock-${selections.length}`}` to `<LockWeekControl>`
     so any add/remove while confirming remounts it to idle (simplest correct approach; no
     effect wiring in the child)
   - New inline error, sibling to the existing `toggleSelection.isError` alert:
     `isCurrentWeek && lockPlan.isError` → `Alert status="error"` _"Couldn't lock this week,
     try again."_
   - **Reword** the `isCurrentWeek && isLocked && selections.length > 0` block (lines
     ~132–137): from _"This plan is locked — its shopping list has already been sent…"_ to
     _"This week's plan is locked in — saved to your history."_, with
     `formatWeekRange(plan.start_date)` shown alongside (e.g. an eyebrow or a second line)
   - **"Next week opens {date}" line**: Could-priority, depends on intent 011 — **omitted in
     this bolt** (no feature to gate on yet). Noted for 011.
   - Leave the existing `isFull` block ("All three picked. Your shopping list is ready." +
     "See shopping list") **unchanged** — it is about the shopping list, not locking; minimal
     blast radius. (Open for discussion — see Decision Points.)

### Dependencies

- `useLockPlan` (`weekly-plan/hooks.ts:82`) — reused as-is; already invalidates
  `currentPlanKey` on success, so `/plan` re-renders locked with no extra refetch.
- `lock_weekly_plan` RPC (`weekly-plan/api.ts:61`) — idempotent; enforces exactly-3 via
  `trg_weekly_plans_require_three_on_lock`.
- `uiIcons.locked` — already exported.
- `formatWeekRange` — already imported in `PlanPage.tsx`.
- Interaction contract mirrors intent **009**'s `ClearPicksControl` spec (009 not yet built;
  this bolt establishes the shared pattern).

### Technical Approach

- `LockWeekControl` is a near-copy of 009's planned `ClearPicksControl` shape: three prop-
  driven states, local `isConfirming` only, parent owns the mutation + undo/lock semantics.
- Parent-owned mutation state (`lockPlan.isPending` / `.isError`) drives the spinner and the
  error alert — the child stays pure.
- `key`-based reset for "dismiss on pick change" avoids an effect that watches `selections`
  inside the child.
- No test files in this bolt's scope beyond what's needed to keep the suite compiling;
  `PlanPage.test.tsx` extension + `LockWeekControl.test.tsx` are **bolt 044 / story 006**
  (consolidated). If `PlanPage.test.tsx` breaks on the reworded string, it is updated here as
  a minimal fix and fully covered in 044.

### Acceptance Criteria

- [ ] "Lock in this week" button shows only when `isCurrentWeek && !isLocked &&
    selections.length === 3`; never on past weeks; never when locked
- [ ] 1–2 selections (current week, unlocked) → helper line _"Pick 3 dinners to lock in your
      week."_; 0 selections → existing empty state unchanged
- [ ] Pressing the button opens the inline confirm pill (`role="group"` + the exact
      `aria-label`); it does not lock immediately
- [ ] Opening the pill moves focus to "Keep editing"
- [ ] `Escape`, "Keep editing", or adding/removing a dinner all dismiss the pill with no lock
      call
- [ ] "Lock it in" calls `useLockPlan().mutateAsync(plan.id)` exactly once; shows a spinner
      while pending
- [ ] On success `/plan` re-renders locked and focus moves to the page heading
- [ ] On failure an inline `Alert` shows _"Couldn't lock this week, try again."_ and the pill
      returns to idle
- [ ] Locked banner reads _"This week's plan is locked in — saved to your history."_ with the
      week range; read-only behaviour (no remove buttons) unchanged
- [ ] Past-week rendering unchanged
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; existing `weekly-plan` suite still compiles
      (string-assertion fixes only if needed)

### Decision Points for Checkpoint

1 - **`isFull` block**: leave "All three picked. Your shopping list is ready." + "See shopping
list" untouched (recommended — it's a shopping-list affordance, not locking), **or** fold
the lock control into that block instead of a separate header-region block.
2 - **Idle button emphasis**: `variant="solid" size="sm"` (a real primary, recommended for an
affirmative commit) vs. `variant="quiet" size="sm"` (matches 009's restrained "Clear
picks").
3 - **Week-range placement in the locked banner**: eyebrow `Text` above the sentence vs. an
inline "(9/7 – 9/13)" suffix.
