---
id: 001-sm-is-44-on-a-phone
unit: 001-touch-target-size
intent: 024-mobile-ergonomics
status: complete
priority: must
created: '2026-09-18T13:10:36Z'
assigned_bolt: null
implemented: true
---

# Story: 001-sm-is-44-on-a-phone

## User Story

**As a** household member tapping with a thumb
**I want** the small buttons to be big enough to hit
**So that** I don't press the wrong thing while cooking or shopping

## Acceptance Criteria

- [ ] **Given** a phone width, **Then** the theme's `sm` control is 44px tall with a 44px minimum width
- [ ] **Given** `md` and above, **Then** it is 34px, as today
- [ ] `md` (44px) and `lg` (52px) are unchanged at every width
- [ ] Text inside a `sm` control keeps its size; only the box grows
- [ ] A `sm` `IconButton` measures at least 44×44px on a phone, checked in a browser

## Technical Notes

- `theme/index.ts`, `Button.sizes.sm`; `IconButton` inherits it
- Chakra size styles take responsive values, so one entry can carry both widths
- The comment above the sizes already states this rule — make it true rather than rewrite it

## Dependencies

- None
