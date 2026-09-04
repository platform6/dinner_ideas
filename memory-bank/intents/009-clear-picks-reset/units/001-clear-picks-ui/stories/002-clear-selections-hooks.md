---
id: 002-clear-selections-hooks
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
status: complete
priority: must
created: '2026-09-04T02:36:10Z'
assigned_bolt: 048-clear-picks-ui
implemented: true
---

# Story: 002-clear-selections-hooks

## User Story

**As a** developer wiring the Clear Picks control
**I want** one keyed `delete` for clearing and an ordered sequential re-add for undo
**So that** clearing is atomic with a single failure point and Undo restores the exact 1/2/3
order

## Acceptance Criteria

- [ ] **Given** `clearSelections(planId: string): Promise<void>` in `weekly-plan/api.ts`,
      **When** called, **Then** it runs one
      `supabase.from('weekly_plan_selections').delete().eq('weekly_plan_id', planId)`, throws
      on a Supabase `error`, and does **not** delete the `weekly_plans` row.
- [ ] **Given** an already-empty plan, **When** `clearSelections` runs, **Then** it is a
      no-op success (idempotent). A plan id from another household deletes zero rows (existing
      household RLS, `20260828232000`) rather than erroring.
- [ ] **Given** `useClearSelections()` in `weekly-plan/hooks.ts`, **When** its `mutationFn`
      runs with the current plan, **Then** it reads `plan.weekly_plan_selections.map(s =>
    s.dinner_id)` **before** deleting, calls `clearSelections(plan.id)`, and **returns those
      dinner ids in selection order**.
- [ ] **Given** `useClearSelections` succeeds, **When** `onSuccess` runs, **Then** it
      invalidates `['weekly-plan','current']` (the `currentPlanKey` prefix — matches the
      week-aware key from intent 011).
- [ ] **Given** `useClearSelections`, **When** implemented, **Then** it is **not** N ×
      `useToggleSelection` (that hook derives add/remove from a caller snapshot — firing it
      repeatedly is the stale-snapshot hazard `selectionDisabled` guards against).
- [ ] **Given** `useRestoreSelections()` in `weekly-plan/hooks.ts`, **When** its `mutationFn`
      runs with `{ planId, dinnerIds }`, **Then** it re-adds each id by calling
      `addSelection(planId, dinnerId)` **sequentially** (`for` loop, awaited — not
      `Promise.all`) and `onSuccess` invalidates `['weekly-plan','current']`.

## Technical Notes

- `currentPlanKey` is module-private in `hooks.ts` — the new hooks live in the same file and
  reuse it.
- `addSelection(planId, dinnerId)` already exists (`weekly-plan/api.ts`).

## Dependencies

### Requires

- None (independent of the component; grouped into bolt 048)

### Enables

- 003-catalog-mount-and-undo-bar
- 004-in-flight-and-error-handling
- 006-clear-picks-tests

## Edge Cases

| Scenario                                               | Expected Behavior                                                                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Plan has 0 selections when clear fires                 | `clearSelections` no-ops; `useClearSelections` returns `[]`; parent shows nothing to undo                                    |
| `addSelection` fails mid-undo (id 2 of 3)              | The mutation rejects; parent surfaces the undo error (story 004); ids 1 is re-added, 3 is not — acceptable, user can re-pick |
| No `weekly_plan_selections` "exactly 3" delete trigger | Confirmed at build start — the lock-time check is on lock, not on every write                                                |

## Out of Scope

- The component (story 001)
- Where the returned ids are held / the undo bar (story 003)
