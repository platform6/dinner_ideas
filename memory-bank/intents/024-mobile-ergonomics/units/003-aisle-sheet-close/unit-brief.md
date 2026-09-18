---
unit: 003-aisle-sheet-close
intent: 024-mobile-ergonomics
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: ready
created: '2026-09-18T13:10:36Z'
updated: '2026-09-18T13:10:36Z'
---

# Unit Brief: Aisle Sheet Close

## Purpose

The aisle sheet can be closed by an obvious control, and its last action is never at the very edge.

## Scope

### In Scope

- A visible, labelled close control meeting FR-1
- Bottom spacing so "Take it off the path" clears the screen edge

### Out of Scope

- Anything the sheet does: suggestions, placements, dismissals
- The sheet at md+

## Notes

`AssignSheet.tsx:97` is a Chakra `Drawer` with `placement="bottom"`, an overlay and `finalFocusRef`, so Escape, the outside tap and focus return already work. The theme's `CloseButton` `sm` is 16×16px, so that component at that size cannot be the answer.

## Stories

- `001-sheet-closes-visibly`: A close control that is big enough and labelled (Should)
