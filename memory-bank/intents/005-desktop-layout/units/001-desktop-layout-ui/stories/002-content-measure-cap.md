---
id: 002-content-measure-cap
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: must
created: '2026-08-28T19:30:00Z'
assigned_bolt: 032-desktop-layout-ui
implemented: true
---

# Story: 002-content-measure-cap

## User Story

**As a** household member on a 1440px laptop
**I want** text lines to stop at a comfortable width
**So that** a shopping-list line or a numbered plan row doesn't stretch across 1300px of empty paper

## Acceptance Criteria

- [ ] **Given** the `<main>` region in `Layout.tsx`, **When** it renders, **Then** its inner wrapper
      is `maxW={isWide ? '1080px' : '720px'}` with `mx="auto"`
- [ ] **Given** `isWide`, **When** computed, **Then** it is `wide` prop ?? `WIDE_ROUTES.has(location.pathname)`,
      where `WIDE_ROUTES = new Set(['/', '/store-config'])`
- [ ] **Given** a viewport < 768px, **When** a screen renders, **Then** it looks the same as after
      intent `003` (the cap is inert at phone widths)
- [ ] **Given** Login, **When** rendered, **Then** it keeps its own `maxW="sm"` (story `003` handles its vertical position)

## Technical Notes

- Comes from `Layout.reference.tsx` — the wide measure is derived from the pathname so `App.tsx`
  (`<Layout><Routes/></Layout>`) needs no restructure.
- Same file as story `001`; land them together in bolt `032`.

## Dependencies

### Requires

- `001-left-rail-navigation` (same `Layout.tsx` rewrite)

### Enables

- `006-store-setup-side-by-side` and `007-catalog-xl-third-column` rely on `/store-config` and `/`
  being in `WIDE_ROUTES`

## Edge Cases

| Scenario                     | Expected Behavior                                               |
| ---------------------------- | --------------------------------------------------------------- |
| A very wide monitor (2560px) | Content stays at the cap, centred; rails of paper on both sides |
| A route not in `WIDE_ROUTES` | 720px cap                                                       |

## Out of Scope

- Any per-screen `md+` reshape (later stories)
