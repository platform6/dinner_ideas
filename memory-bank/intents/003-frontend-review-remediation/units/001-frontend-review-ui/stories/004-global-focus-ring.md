---
id: 004-global-focus-ring
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: must
created: '2026-08-28T17:10:00Z'
assigned_bolt: 023-frontend-review-ui
implemented: true
---

# Story: 004-global-focus-ring

## User Story

**As a** keyboard user
**I want** the olive focus ring on every focusable control, not just buttons
**So that** tabbing through the cooking accordion or the pick checkbox doesn't drop me onto a stock Chakra blue ring

## Acceptance Criteria

- [ ] **Given** `src/shared/theme/index.ts`, **When** the `styles.global` rule from `theme-patch.ts` §5 is added, **Then** `:focus-visible` on `a`, `button`, `[role="button"]`, `input`, `select`, `textarea`, `[tabindex]` shows a 3px `rgba(74,103,65,0.28)` ring with `control` radius and `outline: none`
- [ ] **Given** the `Button` baseStyle, **When** the global rule is in place, **Then** `Button`'s own `_focusVisible` ring is removed and `Button` still shows exactly one olive ring (no double ring)
- [ ] **Given** the cooking accordion header (`as="button"`) and the dinner-card pick checkbox, **When** focused by keyboard, **Then** each shows the olive ring, not Chakra blue
- [ ] **Given** a mouse click (not keyboard), **When** a control is activated, **Then** no ring appears (`:focus-visible`, not `:focus`)

## Technical Notes

- `theme-patch.ts` §5 is a single `globalFocus` object → merge into `theme.styles.global`.
- Removing the `Button` copy is explicitly called for in §5's comment — do it in the same story so
  there's never a moment with two rings.
- No component code changes; this is theme-only.

## Dependencies

### Requires

- None (independent of the other §-blocks, but grouped in bolt `023` since it's the same file)

### Enables

- `004-desktop-layout`'s rail links inherit this ring for free

## Edge Cases

| Scenario                                      | Expected Behavior                                            |
| --------------------------------------------- | ------------------------------------------------------------ |
| A control sets its own `_focusVisible`        | Its explicit style wins — global is the floor, not a ceiling |
| A non-interactive element gets `tabIndex={0}` | Gets the ring — acceptable; it's genuinely focusable         |

## Out of Scope

- Hover states (intent `004`)
- Any per-control focus tuning beyond removing the redundant `Button` copy
