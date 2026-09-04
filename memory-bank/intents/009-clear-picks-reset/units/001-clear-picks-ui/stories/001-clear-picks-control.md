---
id: 001-clear-picks-control
unit: 001-clear-picks-ui
intent: 009-clear-picks-reset
status: complete
priority: must
created: '2026-09-04T02:36:10Z'
assigned_bolt: 048-clear-picks-ui
implemented: true
---

# Story: 001-clear-picks-control

## User Story

**As a** household member who has picked 1–3 dinners
**I want** a "Clear picks" control in the catalog header with a quick inline confirm
**So that** I can reset the week in one guarded action instead of un-picking each card

## Acceptance Criteria

- [ ] **Given** `ClearPicksControl.tsx` (new, prop-driven `{ count: number; onClear: () =>
    void; isClearing?: boolean }`, owning only `isConfirming` locally), **When** `count ===
    0`, **Then** it renders `null` (no disabled button, no placeholder).
- [ ] **Given** `count` is 1–3 and not confirming, **When** it renders, **Then** it shows a
      single quiet button: `Button variant="quiet" size="sm"`, `leftIcon={uiIcons.restore}`
      (13px, `strokeWidth={2.2}`), label **"Clear picks"** — hover/focus from the `quiet`
      variant + the global focus ring only.
- [ ] **Given** the confirm is open, **When** it renders, **Then** it is an inline `HStack`
      pill (`role="group"`, `aria-label="Confirm clearing this week's picks"`): label **"Clear
      all {count}?"** (live count, `whiteSpace="nowrap"`), a **"Keep"** button, and a **"Clear
      all"** button.
- [ ] **Given** the confirm is open, **When** "Clear all" is clicked, **Then**
      `setIsConfirming(false)` runs and then `onClear()` is called; while `isClearing`, "Clear
      all" shows its `isLoading` spinner.
- [ ] **Given** the "Clear all" button, **When** it renders, **Then** it is the app's only
      filled terracotta button — styled with props **at the call site** (`bg="heart.500"`,
      `_hover="heart.600"`, `_active="heart.700"`, `color="paper.base"`); **no** `danger`
      Button theme variant is added.
- [ ] **Given** "Keep", **When** it renders, **Then** transparent, `1px heart.200` border,
      `heart.700` text, hover `heart.100`.
- [ ] **Given** the state swap (button ⇄ pill), **When** it happens, **Then** there is no
      transition/animation — the pill replaces the button instantly.

## Technical Notes

- Sibling of `LockWeekControl.tsx` (bolt 043) — same three-state prop-driven shape, same
  local-only `isConfirming`, same "parent owns the mutation" split.
- `uiIcons.restore` (`RotateCcw`) already exported.
- The dismiss-on-pick-change rule is the parent's job (story 003, via a `key`); this component
  only handles "Keep" and `Escape` (story 002).

## Dependencies

### Requires

- None (first story of the unit)

### Enables

- 002-clear-picks-inline-confirm
- 003-catalog-mount-and-undo-bar

## Edge Cases

| Scenario                         | Expected Behavior                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `count` changes 1 → 0 while idle | Component returns `null` (parent stops rendering it anyway once the plan is empty) |
| `count` changes while confirming | Label "Clear all {count}?" reflects the live count                                 |

## Out of Scope

- `Escape` handling and focus-to-"Keep" (story 002)
- The `clearSelections` call behind `onClear` (story 002 hooks)
- Catalog placement / undo bar (story 003)
