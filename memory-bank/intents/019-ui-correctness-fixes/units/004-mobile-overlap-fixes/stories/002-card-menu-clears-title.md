---
id: 002-card-menu-clears-title
unit: 004-mobile-overlap-fixes
intent: 019-ui-correctness-fixes
status: planned
priority: should
created: '2026-09-17T16:01:11Z'
assigned_bolt: null
implemented: false
---

# Story: 002-card-menu-clears-title

## User Story

**As a** household member using the app on a phone
**I want** the dinner's name to stay readable when I open a card's actions
**So that** I can see which dinner "Not interested" or "Remove…" will act on

## Acceptance Criteria

- [ ] **Given** a phone-width card whose title wraps to two lines, **When** "More actions" opens, **Then** no part of the title is covered
- [ ] **Given** a card near the bottom of the viewport, **Then** the title is still not covered, whichever way the menu is placed
- [ ] At md+ the menu opens from its button and does not cover the title
- [ ] Keyboard operation, Escape and close-on-select behave as today
- [ ] Verified at phone width in the running app

## Technical Notes

- `DinnerCard.tsx:274`, `<Menu placement="bottom-end">`
- Options for design: an offset or placement that clears the title block, or a bottom action sheet at phone width, matching `AssignSheet`. Choose at the plan stage.

## Dependencies

- None
