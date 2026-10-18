---
id: 001-photo-slots-switched-off
unit: 001-photo-slots-off
intent: 025-hide-photo-slots
status: complete
priority: must
created: '2026-10-18T20:06:52Z'
assigned_bolt: 083-photo-slots-off
implemented: true
---

# Story: 001-photo-slots-switched-off

## User Story

**As a** household member
**I want** cards and rows without empty picture tiles
**So that** the app doesn't show space waiting for photos that don't exist yet

## Acceptance Criteria

- [ ] With `SHOW_PHOTO_SLOTS` `false`, the catalog dinner card, the cooking view row and the This week three-across card render no slot element (absent from the DOM, not hidden with CSS)
- [ ] The title and meta take the slot's place and stay aligned, at 390px and at desktop width
- [ ] The This week three-across card goes straight from the badge and remove row to name and meta, with even spacing
- [ ] The catalog card's meta-row cuisine icon and name are unchanged
- [ ] With the constant `true`, all three slots render exactly as they do today
- [ ] The constant is defined once and imported by all three components
- [ ] Tests cover both values
- [ ] `ux-guide.md` lists the three slots (where, size, what they hold), names the constant, and says it's off until photos exist

## Technical Notes

- Put the constant somewhere all three features already import from (`src/shared/`). It is a plain
  `export const`, not an env read (Checkpoint 1).
- Testing both values means mocking the module, or passing the flag in as a prop with the constant as
  the default. Choose one in the plan.
- Check the pages at 390px in a same-origin iframe, because Chrome's resize doesn't narrow the
  viewport.

## Dependencies

- None
