---
id: 003-catalog-mount-and-undo-bar
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
status: complete
priority: must
created: '2026-09-04T02:36:10Z'
assigned_bolt: 049-clear-picks-ui
implemented: true
---

# Story: 003-catalog-mount-and-undo-bar

## User Story

**As a** household member who just cleared the week
**I want** a persistent "N dinners cleared — Undo" bar
**So that** I can put the picks back if I changed my mind, at my own pace

## Acceptance Criteria

- [ ] **Given** `CatalogPage.tsx`'s right-hand header `HStack gap={2}`, **When** the control
      is mounted, **Then** `<ClearPicksControl>` is its **2nd** child — order: count `Badge`,
      control, "Not interested" `IconButton`. Nothing else in the header moves;
      `justify="space-between"`, `mb={4}`, `flexWrap="wrap"`, `gap` unchanged; the right stack
      still wraps below the title on a narrow phone; all three controls ≥ 32px tall.
- [ ] **Given** the control's `count`, **When** passed, **Then** it is `selectedDinnerIds.size`
      (the existing memo). Because that memo is already empty when `plan` is `null` or
      `plan.locked_at !== null`, the control hides in those cases with **no extra guard**.
- [ ] **Given** `CatalogPage` owns `clearedIds: string[] | null` (the ids removed by the last
      clear; `null` hides the bar), **When** a clear succeeds, **Then** `clearedIds` is set to
      the ids `useClearSelections` returned and the confirm pill disappears (count is 0).
- [ ] **Given** `clearedIds` is non-null, **When** the catalog renders, **Then** an **undo
      bar** appears **below the header, above the filters** — the same slot the
      `toggleSelection.isError` alert occupies (`mb={4}`): `HStack justify="space-between"`,
      `bg="paper.subtle"`, `1px line.subtle`, radius `field`; `uiIcons.info` (15px) + text
      **"{n} dinners cleared."** — singularised at 1 ("1 dinner cleared.") — + an **"Undo"**
      button (`variant="outline" size="sm"`, `leftIcon={uiIcons.restore}`).
- [ ] **Given** the undo bar, **When** shown, **Then** it is announced via
      `aria-live="polite"`, and it persists until **one of**: "Undo" is pressed, the user
      picks another dinner, or they navigate away from the catalog. It does **not**
      auto-dismiss on a timer.
- [ ] **Given** "Undo" is pressed, **When** clicked, **Then**
      `useRestoreSelections().mutate({ planId, dinnerIds: clearedIds })` runs and `clearedIds`
      is set back to `null`.
- [ ] **Given** the user picks another dinner while the bar is shown, **When** that toggle
      fires, **Then** `clearedIds` is set to `null` (and the same reset closes an open confirm
      pill via `ClearPicksControl`'s remount `key`).

## Technical Notes

- `planId` for Undo = `currentPlan.data?.id`. After a clear the plan row still exists (empty).
- Wire `onClear` on `ClearPicksControl` to `useClearSelections().mutate(currentPlan.data)`,
  setting `clearedIds` in `onSuccess` from the mutation result.
- Give `<ClearPicksControl key={selectedDinnerIds ...}>` a key derived from the selection set
  so any pick change while confirming remounts it to idle (same trick as `LockWeekControl`).

## Dependencies

### Requires

- 001-clear-picks-control
- 002-clear-selections-hooks

### Enables

- 004-in-flight-and-error-handling
- 005-keyboard-and-a11y
- 006-clear-picks-tests

## Edge Cases

| Scenario                                                      | Expected Behavior                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `clearedIds` set, then plan becomes locked in another tab     | Bar hidden (guard the bar with `!isLocked` as well as `clearedIds != null`) |
| Undo pressed twice quickly                                    | Guarded by the mutation's `isPending`; fires once                           |
| `currentPlan.data` is `null` when Undo is pressed (rare race) | Undo is a no-op; `clearedIds` still cleared to `null`                       |

## Out of Scope

- Disabling the pick cards while clearing / undo error copy (story 004)
- Focus movement + full keyboard flow (story 005)
