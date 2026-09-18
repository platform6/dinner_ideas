---
unit: 001-touch-target-size
intent: 024-mobile-ergonomics
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: ready
created: '2026-09-18T13:10:36Z'
updated: '2026-09-18T13:10:36Z'
---

# Unit Brief: Touch Target Size

## Purpose

Every control the household taps is at least 44×44px on a phone, and unchanged at a desk.

## Scope

### In Scope

- The theme's `sm` control size: 44px below `md`, 34px at `md` and above
- A screen-by-screen check of the controls FR-1 names, on a phone and at 1024px
- Any reflow the larger controls cause on those screens

### Out of Scope

- The `xs` controls in the step editor (unit 002)
- Colour, contrast and typography (intent 020)
- Desktop density, which must not change

## Notes

`theme/index.ts` defines `Button` sizes `md: 44px`, `sm: 34px`, `lg: 52px`, and `IconButton` inherits them. `sm` is used 78 times in `src/`, so this is one edit felt everywhere — which is the point, and the risk. The comment above those sizes already claims the 44px rule; this makes it true.

## Stories

- `001-sm-is-44-on-a-phone`: The theme's small control is 44px below md (Must)
- `002-no-screen-reflows-badly`: The named screens survive the larger controls (Must)
