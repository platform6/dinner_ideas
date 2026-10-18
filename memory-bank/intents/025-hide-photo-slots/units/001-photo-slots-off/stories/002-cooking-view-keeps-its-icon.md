---
id: 002-cooking-view-keeps-its-icon
unit: 001-photo-slots-off
intent: 025-hide-photo-slots
status: complete
priority: must
created: '2026-10-18T20:06:52Z'
assigned_bolt: 083-photo-slots-off
implemented: true
---

# Story: 002-cooking-view-keeps-its-icon

## User Story

**As a** household member cooking
**I want** to still see each dinner's cuisine icon
**So that** I can find a dinner at a glance with the thumb gone

## Acceptance Criteria

- [ ] With the slots off, each cooking-view row's meta line starts with a 13px cuisine icon, before the cook time, using the same size and stroke as the catalog card's meta row
- [ ] With the slots on, the inline icon is gone and the 44px thumb is back, so the icon is never shown twice
- [ ] The row's expand and collapse control works the same either way

## Technical Notes

- `CookingViewPage.tsx:127-134`: the meta `HStack` already holds `metaIcons.cookTime` at 13px / 1.8.
  Put the cuisine icon in front of it, matching `DinnerCard.tsx:285-287`.

## Dependencies

- `001-photo-slots-switched-off` (the constant)
