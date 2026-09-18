---
id: 001-sheet-closes-visibly
unit: 003-aisle-sheet-close
intent: 024-mobile-ergonomics
status: planned
priority: should
created: '2026-09-18T13:10:36Z'
assigned_bolt: null
implemented: false
---

# Story: 001-sheet-closes-visibly

## User Story

**As a** household member placing an item on a phone
**I want** an obvious way to close the sheet
**So that** I don't have to guess that tapping outside works

## Acceptance Criteria

- [ ] The sheet shows a close control that is at least 44×44px and labelled for screen readers
- [ ] Escape, the overlay tap and the focus trap keep working
- [ ] **Given** a 667px-tall phone and the longest suggestion list the fixtures produce, **Then** "Take it off the path" is fully visible without scrolling the sheet
- [ ] Closing with the new control returns focus where Escape already returns it

## Technical Notes

- `AssignSheet.tsx:97`, a Chakra `Drawer` with `finalFocusRef`
- The theme's `CloseButton` `sm` is 16×16px: use a larger size or an `IconButton`
- Bottom spacing interacts with the phone tab bar; `tab-bar.ts` holds its height

## Dependencies

- Unit `001-touch-target-size`
