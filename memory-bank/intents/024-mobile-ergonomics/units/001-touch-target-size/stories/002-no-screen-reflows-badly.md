---
id: 002-no-screen-reflows-badly
unit: 001-touch-target-size
intent: 024-mobile-ergonomics
status: complete
priority: must
created: '2026-09-18T13:10:36Z'
assigned_bolt: null
implemented: true
---

# Story: 002-no-screen-reflows-badly

## User Story

**As a** household member
**I want** the bigger buttons not to break the screens they sit on
**So that** nothing looks broken or gets harder to read

## Acceptance Criteria

- [ ] Checked on a phone and at 1024px: the app header (Store setup, Settings, Log out), `/plan` (week arrows, "Lock in this week", per-dinner remove), the catalog (add, "Not interested", the card menu and Details), the shopping list (move to aisle, Copy footer), Store setup, Settings, and the Add a dinner form
- [ ] No header wraps onto an extra line on a phone, and no row overlaps another
- [ ] At 1024px every one of those controls still measures 34px
- [ ] Anything that has to move to fit is recorded in the walkthrough, with a screenshot

## Technical Notes

- jsdom has no layout, so this story is verified in a browser (NFR-3)
- The shopping list footer measures its own height for scroll padding (bolt 076); a taller Copy button changes that number, which is fine, but worth re-checking that focus still clears it

## Dependencies

- `001-sm-is-44-on-a-phone`: there is nothing to check until the size changes
