---
id: 001-ink-ramp-aa-correction
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: must
created: '2026-08-28T17:10:00Z'
assigned_bolt: 022-frontend-review-ui
implemented: true
---

# Story: 001-ink-ramp-aa-correction

## User Story

**As a** household member reading the app
**I want** the grey body text to actually be legible
**So that** "last made" lines, empty states and help text aren't washed out on the warm paper background

## Acceptance Criteria

- [ ] **Given** `src/shared/theme/index.ts`, **When** the `ink` block is replaced per `theme-patch.ts` §1, **Then** `ink.400 = #726C5B`, `ink.300 = #757060`, `ink.200 = #8A8272`, and `ink.900 / 700 / 500` are unchanged
- [ ] **Given** the corrected tokens, **When** measured against `paper.base` (#FFFDFA), **Then** each of `ink.400 / 300 / 200` is ≥ 4.5:1 (5.1 / 4.9 / 4.5)
- [ ] **Given** `textStyle="faint"` (→ `ink.300`), **When** the app renders, **Then** its body copy is re-checked on `PlanPage` empty states, `SuppressedPage` metadata, `StoreConfigPage` help text, the `ShoppingListPage` prompt, and every dinner card's "last made" line
- [ ] **Given** the `eyebrow` colour (→ `ink.400`), **When** the app renders, **Then** the eyebrow above every page title is re-checked
- [ ] **Given** the change, **When** the suite runs, **Then** no test needs updating — this is a token-value change only

## Technical Notes

- One file, three values. The fastest diff is against the corrected `theme.ts` in the sibling
  `design_handoff_dinner_ideas_theme/` folder, which already has the corrected ramp.
- No component markup changes. No new token.

## Dependencies

### Requires

- None — first story in the unit

### Enables

- `004-global-focus-ring` and the other `theme-patch.ts` stories share the same file; landing this
  first keeps the blocker independently shippable

## Edge Cases

| Scenario                                          | Expected Behavior                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| A screen hardcodes a grey outside the `ink` scale | Out of scope here — not part of `theme-patch.ts` §1; note it for later |
| A snapshot test asserts a literal old hex         | Update the snapshot; the value change is intentional                   |

## Out of Scope

- `ink.900 / 700 / 500` (unaffected)
- Any component-level colour usage not routed through the `ink` tokens
