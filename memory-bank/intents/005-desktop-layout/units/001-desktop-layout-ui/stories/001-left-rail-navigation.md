---
id: 001-left-rail-navigation
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: must
created: '2026-08-28T19:30:00Z'
assigned_bolt: 032-desktop-layout-ui
implemented: true
---

# Story: 001-left-rail-navigation

## User Story

**As a** household member on a laptop
**I want** a persistent left rail with every nav destination
**So that** Catalog, This week, Shopping list and Cooking aren't reachable only by typing URLs

## Acceptance Criteria

- [ ] **Given** a viewport ≥ 768px, **When** the app renders, **Then** a 240px left rail is shown
      (`sticky`, `top=0`, `h=100vh`, `bg="paper.base"`, 1px `line.subtle` right border) and no `<header>`
- [ ] **Given** a viewport < 768px, **When** the app renders, **Then** the header + fixed bottom tab
      bar render exactly as today
- [ ] **Given** the rail, **When** it renders, **Then** its items come from the same `navItems` array
      as the tab bar, its head is the app name and its foot (top hairline) has Store setup then Log out
- [ ] **Given** the active route, **When** the rail renders, **Then** that item is `bg="brand.50"` /
      `color="brand.500"`; inactive items are `color="ink.300"`, hover `bg="paper.subtle"` / `color="ink.700"`
- [ ] **Given** either breakpoint, **When** the DOM is queried, **Then** there is exactly one link
      per route (only one nav is rendered — via `useBreakpointValue`)
- [ ] **Given** the app name, **When** it renders, **Then** it is `fontFamily="heading"` `0.9375rem`
      (`ink.700` in the phone header, `ink.900` in the rail head) — not `textStyle="cardTitle"` (review finding 11)

## Technical Notes

- Base the implementation on `Layout.reference.tsx` from the handoff, but replace its pure-CSS
  `display` toggling of the two navs with a single-nav render: `useBreakpointValue({ base: 'mobile', md: 'desktop' })`.
  This is what keeps `Layout.test.tsx`'s singular `getByRole` queries valid and needs FR-9's
  `matchMedia` polyfill (same bolt, land it first).
- `App.tsx` stays `<Layout><Routes/></Layout>` — no restructure.
- Store setup + Log out: header `IconButton`s below md (as today), rail-foot `RailLink` + button at md+.

## Dependencies

### Requires

- `009-responsive-test-infrastructure` (matchMedia polyfill + ChakraProvider wrapper) — same bolt, first

### Enables

- `002-content-measure-cap` (same file), and every screen-reshape story (they assume the rail exists)

## Edge Cases

| Scenario                                       | Expected Behavior                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| A route not in `navItems` (e.g. `/suppressed`) | No rail item; still reachable via its in-app link; rail shows no active item |
| Exact 767 / 768px boundary                     | One layout or the other, no both-navs flash                                  |

## Out of Scope

- The content measure cap (story `002`) and any screen's md+ reshape
