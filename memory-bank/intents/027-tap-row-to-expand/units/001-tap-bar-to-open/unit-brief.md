---
unit: 001-tap-bar-to-open
intent: 027-tap-row-to-expand
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-10-19T10:20:41Z'
updated: '2026-10-19T10:20:41Z'
---

# Unit Brief: Tap Bar to Open

## Purpose

A picked dinner on This week opens when you tap its bar, as a Cook tab row does, not only when you
hit the small expand icon.

## Scope

### In Scope

- A click handler on the phone row's bar and on the desktop card's top part
- `stopPropagation` on the expand and remove buttons, so each does its own job once
- `cursor="pointer"`, and a `line.brand` border on hover while collapsed

### Out of Scope

- The Cook tab and the catalog
- What the details show, and how they load
- Keyboard behaviour (the expand icon stays the keyboard control)

## Notes

- `PlanPage.tsx`, phone: the bar is the `HStack justify="space-between"` inside the
  `Box layerStyle="cardSelected"`. The details render below it in a `Box mt={3}`, outside the bar.
- `PlanPage.tsx`, desktop: the `Stack layerStyle="cardSelected"` holds the badge row, the photo slot
  (off), the name and meta, then the details. The first three go in one clickable wrapper.
- The Cook tab's hover is `_hover={isExpanded ? undefined : { borderColor: 'line.brand' }}` with
  `transition="border-color 0.12s ease"` on the card.
- Tests: the intent 026 describe in `PlanPage.test.tsx` already has phone and desktop helpers
  (`renderAt(width)`), and mocks the dinners API.

## Stories

- `001-tap-the-bar`: tapping a picked dinner's bar opens or closes it (Must)
