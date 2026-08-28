---
id: 006-shopping-list-action-bar
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: should
created: '2026-08-28T17:10:00Z'
assigned_bolt: 025-frontend-review-ui
implemented: true
---

# Story: 006-shopping-list-action-bar

## User Story

**As a** household member on my phone
**I want** the lock checkbox and "Copy shopping list" button fully visible, not tucked under the tab bar
**So that** the primary action of this screen isn't partly covered

## Acceptance Criteria

- [ ] **Given** `ShoppingListPage.tsx`, **When** the sticky action container is updated, **Then** its `bottom` is `{ base: '70px', md: 0 }` (was `0`)
- [ ] **Given** the page `Stack`, **When** rendered, **Then** the local `pb={20}` is removed (Layout already applies `pb="70px"` on phone)
- [ ] **Given** a phone viewport, **When** the shopping list renders, **Then** the lock checkbox and Copy button sit fully above the 70px tab bar with nothing clipped, and bottom whitespace is not doubled
- [ ] **Given** a ≥768px viewport, **When** the shopping list renders, **Then** the sticky footer is gone and the lock checkbox + Copy button appear as a right-aligned `HStack` in the page header, opposite the "Shopping list" title
- [ ] **Given** either layout, **When** the user copies, **Then** lock-on-copy and disabled-when-already-locked behave exactly as today
- [ ] **Given** the moved controls, **When** the suite runs, **Then** `ShoppingListPage` tests are updated to find the controls in their new location; copy/lock logic assertions are unchanged

## Technical Notes

- Current structure: `Stack gap={4} pb={20}` wrapper (L125); eyebrow + `Heading textStyle="pageTitle" as="h1"`
  header (L128–133); `position="sticky" bottom={0}` container (L233) holding the lock `Checkbox`
  (L242) and the "Copy shopping list" `Button` (L255).
- At md+, render the same two controls in an `HStack` inside the header row (`justify="space-between"`),
  and drop `position="sticky"` for that breakpoint (or conditionally render the footer only below md).
- This is the full review finding 3, per the decision to do it here. The md+ **two-column
  category-group flow** is still out of scope — that's intent `004`.

## Dependencies

### Requires

- Theme foundation from bolt `023` (no hard dependency; keeps ordering sane) — this bolt runs after `023`

### Enables

- `004-desktop-layout`'s shopping-list two-column reshape builds on the md+ header layout landed here

## Edge Cases

| Scenario                                 | Expected Behavior                                         |
| ---------------------------------------- | --------------------------------------------------------- |
| Plan already locked (`locked_at` set)    | Checkbox disabled + checked in both layouts, as today     |
| Very short list on a tall desktop screen | No sticky footer at md+; controls stay in the header      |
| Landscape phone near the md boundary     | One layout or the other, no overlap — verify at 767/768px |

## Out of Scope

- Two-column category-group flow at md+ (intent `004`)
- Restyling the Copy button itself (already themed in `002-kitchen-table-theme`)
