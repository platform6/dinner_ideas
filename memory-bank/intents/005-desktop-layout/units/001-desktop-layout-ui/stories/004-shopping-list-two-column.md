---
id: 004-shopping-list-two-column
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: should
created: '2026-08-28T19:30:00Z'
assigned_bolt: 033-desktop-layout-ui
implemented: true
---

# Story: 004-shopping-list-two-column

## User Story

**As a** household member reading the list on a laptop before leaving for the store
**I want** the whole list visible at once in two columns, with the actions up near the title
**So that** I'm not scrolling a single tall column and hunting for a sticky footer

## Acceptance Criteria

- [ ] **Given** md+, **When** the shopping list renders, **Then** the category groups flow into two
      CSS columns (`sx={{ columns: 2, columnGap: '28px' }}`) with `breakInside: 'avoid'` on each
      category `Box` so no category splits across the break
- [ ] **Given** md+, **When** rendered, **Then** the sticky footer is gone and the lock checkbox +
      Copy button sit in the page header as a right-aligned `HStack` opposite the title
- [ ] **Given** a viewport < 768px, **When** rendered, **Then** the layout is exactly the intent
      `003` state — single column, sticky bar with `bottom={{ base: '70px' }}`
- [ ] **Given** either layout, **When** the user copies, **Then** lock-on-copy and
      disabled-when-locked behave as today
- [ ] **Given** the change, **When** the suite runs, **Then** `ShoppingListPage` tests pass (updated
      where a control's location assertion changed)

## Technical Notes

- Intent `003` bolt `025` already extracted `lockCheckbox` / `copyButton` into `const` fragments and
  made the container responsive — this story adds the two-column group flow and moves the fragments
  into the header at md+.
- With FR-9's `matchMedia` polyfill + `ChakraProvider` wrapper now in place (bolt `032`),
  `useBreakpointValue` is usable here for the single-instance header/footer switch.

## Dependencies

### Requires

- `001-left-rail-navigation` + `009-responsive-test-infrastructure` (bolt `032`)

### Enables

- None

## Edge Cases

| Scenario                                     | Expected Behavior                                                  |
| -------------------------------------------- | ------------------------------------------------------------------ |
| A single very long category (>half the list) | `breakInside: avoid` keeps it whole; the other column may be short |
| Clipboard-fallback `Textarea` visible        | Still renders full-width above the (now header) actions            |

## Out of Scope

- Changing group order (still from `004-grocery-store-config`'s reorder logic)
