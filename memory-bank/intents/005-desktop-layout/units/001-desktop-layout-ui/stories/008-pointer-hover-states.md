---
id: 008-pointer-hover-states
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: could
created: '2026-08-28T19:30:00Z'
assigned_bolt: 034-desktop-layout-ui
implemented: true
---

# Story: 008-pointer-hover-states

## User Story

**As a** household member using a mouse
**I want** things to react when I hover them
**So that** I get feedback before I click, the way a pointer expects

## Acceptance Criteria

- [ ] **Given** `DinnerCard.tsx`, **When** hovered, **Then** it shows `_hover={{ borderColor: 'line.brand' }}`
      — a border change, not a background change (the card is a container of controls, not itself clickable)
- [ ] **Given** `ShoppingListPage.tsx` item rows, **When** rendered, **Then** each row is wrapped in
      the checkbox's `label` so the whole line toggles the checkbox, with `_hover={{ bg: 'paper.subtle' }}`
- [ ] **Given** `CookingViewPage.tsx` accordion header (`as="button"`), **When** hovered, **Then**
      it has `cursor="pointer"` and a `borderColor` shift
- [ ] **Given** all three, **When** the suite runs, **Then** existing tests pass (shopping-list
      "mark as picked up" now also triggers from the row text)

## Technical Notes

- The global focus ring already shipped in intent `003` (bolt `023`) — this story is hover/cursor only.
- Shopping-list row: today the 19px `Checkbox` is the only target and the qty/name are sibling
  `Text`s (`ShoppingListPage.tsx:170–193`). Wrap the row in `<Checkbox>`'s label area (or an
  htmlFor label) so clicking anywhere on the line toggles it.

## Dependencies

### Requires

- Bolt `032` (rail/measure) landed — this bolt runs last

### Enables

- None

## Edge Cases

| Scenario                     | Expected Behavior                                              |
| ---------------------------- | -------------------------------------------------------------- |
| Touch device (no hover)      | No visual change; the larger row hit area still helps on phone |
| A checked shopping-list item | Row still toggles back to unchecked from anywhere on the line  |

## Out of Scope

- Making the whole `DinnerCard` clickable (explicitly not wanted — border is the signal)
