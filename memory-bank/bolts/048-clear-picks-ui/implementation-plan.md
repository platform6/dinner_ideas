---
stage: plan
bolt: 048-clear-picks-ui
created: '2026-09-04T02:36:10Z'
---

## Implementation Plan: 001-clear-picks-ui (bolt 048)

### Objective

Build the two pieces the catalog wiring (bolt 049) will compose: the `ClearPicksControl`
component and the `clearSelections` / `useClearSelections` / `useRestoreSelections` data
layer. Stories **001-clear-picks-control**, **002-clear-selections-hooks**.

### Deliverables

1. **`src/features/weekly-plan/components/ClearPicksControl.tsx`** — new, prop-driven
   `{ count: number; onClear: () => void; isClearing?: boolean }`, owns only `isConfirming`:
   - `count === 0` → `null`
   - idle → `Button variant="quiet" size="sm"` `leftIcon={uiIcons.restore}` (13px,
     `strokeWidth={2.2}`), label "Clear picks"
   - confirming → `HStack role="group" aria-label="Confirm clearing this week's picks"`:
     `Text` "Clear all {count}?" (`whiteSpace="nowrap"`), a **"Keep"** button
     (`variant="outline"` + `borderColor="heart.200" color="heart.700" _hover={{bg:'heart.100'}}`),
     a **"Clear all"** button (call-site fill: `bg="heart.500" _hover={{bg:'heart.600'}}
_active={{bg:'heart.700'}} color="paper.base"`, `isLoading={isClearing}`)
   - "Clear all" → `setIsConfirming(false)` then `onClear()`
   - open → focus "Keep" (ref + effect); `Escape` on the pill → `setIsConfirming(false)`
   - no animation on the swap
   - Structural clone of `LockWeekControl.tsx` (bolt 043).

2. **`src/features/weekly-plan/api.ts`** — `+ clearSelections(planId: string): Promise<void>`
   = `supabase.from('weekly_plan_selections').delete().eq('weekly_plan_id', planId)`; throw
   on `error`; leaves the `weekly_plans` row.

3. **`src/features/weekly-plan/hooks.ts`**
   - `+ useClearSelections()` — `mutationFn(plan: CurrentPlan | null)`: read
     `plan.weekly_plan_selections.map(s => s.dinner_id)` first, `await clearSelections
(plan.id)`, return those ids; `null` plan → return `[]`. `onSuccess` invalidates
     `currentPlanKey`.
   - `+ useRestoreSelections()` — `mutationFn({ planId, dinnerIds })`: `for` loop, awaited
     `addSelection(planId, id)` per id (not `Promise.all`). `onSuccess` invalidates
     `currentPlanKey`.
   - Import `clearSelections`; `addSelection` / `CurrentPlan` / `currentPlanKey` already in
     scope.

4. **Tests**
   - `src/features/weekly-plan/components/ClearPicksControl.test.tsx` — new, mirrors
     `LockWeekControl.test.tsx`: `null` at 0; button at 1–3; opens pill with "Clear all 3?" +
     `role="group"` + `aria-label`; `Escape` and "Keep" dismiss without `onClear`; "Clear
     all" calls `onClear` once; `isClearing` → data-loading on "Clear all"; open focuses
     "Keep".
   - `src/features/weekly-plan/clear-selections.test.ts` — new, `renderHook` + QueryClient
     wrapper, `vi.mock('@/features/weekly-plan/api')`: `useRestoreSelections` calls
     `addSelection` once per id **in order** (assert `mock.calls`); `useClearSelections`
     returns the plan's dinner ids and calls `clearSelections(plan.id)`.

### Dependencies

- `001-weekly-dinner-planner` (complete) — `weekly_plan_selections`, `addSelection`,
  `weekly_plans`, `CurrentPlan` type, `currentPlanKey`.
- `004-account-model` (complete) — household RLS on `weekly_plan_selections`.
- `LockWeekControl` (bolt 043) — the interaction template.

### Acceptance Criteria

- [ ] `ClearPicksControl`: state matrix (0 / 1–3 / confirming), "Clear all" → `onClear` once,
      spinner while `isClearing`, focus-to-"Keep" on open, `Escape` / "Keep" dismiss
- [ ] "Clear all" is the only filled `heart.500` button; "Keep" uses the heart-tinted outline;
      no `danger` theme variant added
- [ ] `clearSelections` = one keyed `delete`, throws on error, plan row intact, idempotent
- [ ] `useClearSelections` returns removed ids in order + invalidates `currentPlanKey`;
      `useRestoreSelections` re-adds sequentially in order + invalidates `currentPlanKey`
- [ ] `tsc -b`, `eslint`, `vite build` clean; full suite green
