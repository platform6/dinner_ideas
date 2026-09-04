---
id: 005-keyboard-and-a11y
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
status: complete
priority: must
created: '2026-09-04T02:36:10Z'
assigned_bolt: 049-clear-picks-ui
implemented: true
---

# Story: 005-keyboard-and-a11y

## User Story

**As a** keyboard user
**I want** the Clear Picks flow to be fully operable and its destructive step guarded
**So that** I never trigger or lose a clear by accident

## Acceptance Criteria

- [ ] **Given** the "Clear picks" button is focused, **When** I press `Enter` or `Space`,
      **Then** the confirm pill opens **and focus moves to "Keep"** (the safe option).
- [ ] **Given** the confirm pill is open, **When** I press `Escape`, **Then** it dismisses to
      idle with no clear call, and focus returns to the "Clear picks" button.
- [ ] **Given** a clear succeeds, **When** the undo bar appears, **Then** focus moves to the
      **"Undo"** button.
- [ ] **Given** the confirm pill, **When** rendered, **Then** it has `role="group"` and
      `aria-label="Confirm clearing this week's picks"`.
- [ ] **Given** the undo bar, **When** rendered, **Then** its container is
      `aria-live="polite"` so the "{n} dinners cleared." text is announced.
- [ ] **Given** all three buttons (Clear picks / Keep / Clear all / Undo), **When** focused,
      **Then** they show the existing global `:focus-visible` olive ring — no per-instance
      focus styling is added.

## Technical Notes

- `ClearPicksControl` owns: focus-to-"Keep" on open (ref + `useEffect` on `isConfirming`),
  the `Escape` keydown handler on the pill. Same wiring as `LockWeekControl`.
- `CatalogPage` owns: focus-to-"Undo" after a successful clear (ref on the Undo button, moved
  in the clear mutation's `onSuccess`).
- No focus-ring CSS — `theme` `styles.global` already covers `:focus-visible` for buttons.

## Dependencies

### Requires

- 001-clear-picks-control
- 003-catalog-mount-and-undo-bar

### Enables

- 006-clear-picks-tests

## Edge Cases

| Scenario                                               | Expected Behavior                                     |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `Escape` pressed while the clear mutation is in flight | Ignored until it resolves (mirrors `LockWeekControl`) |
| Undo bar appears but the "Undo" ref isn't mounted yet  | Focus move is a best-effort `?.focus()`; no crash     |
| Screen reader on the confirm pill                      | Reads the group label then "Clear all {count}?"       |

## Out of Scope

- Any change to the global focus ring
- Non-keyboard interaction (covered by stories 001, 003, 004)
