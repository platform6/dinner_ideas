---
id: 009-responsive-test-infrastructure
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: must
created: '2026-08-28T19:30:00Z'
assigned_bolt: 032-desktop-layout-ui
implemented: true
---

# Story: 009-responsive-test-infrastructure

## User Story

**As a** developer
**I want** responsive components to be testable
**So that** the rail (which must render one nav at a time via `useBreakpointValue`) has real test coverage

## Acceptance Criteria

- [ ] **Given** `src/test/setup.ts`, **When** tests run, **Then** `window.matchMedia` is stubbed to
      report no match (so `useBreakpointValue` / `useBreakpoint` resolve to the `base` value instead of throwing)
- [ ] **Given** a shared render helper, **When** used, **Then** it wraps children in
      `<ChakraProvider theme={theme}>` (composing with `MemoryRouter` / `QueryClientProvider` where needed)
- [ ] **Given** `Layout.test.tsx`, **When** rewritten, **Then** it covers: all 4 nav links + page
      content render once; the current route's nav item is marked active; Store setup + Log out are
      reachable and not inside the tab-bar `nav`; `signOut` fires on click
- [ ] **Given** the change, **When** `vitest run` executes, **Then** the full suite is green

## Technical Notes

- Root cause seen in intent `003` bolt `025`: jsdom has no `matchMedia`, and Chakra's
  `useBreakpoint` also needs a theme context with `__breakpoints` — hence both the polyfill and the
  `ChakraProvider` wrapper.
- Keep the polyfill minimal (a `MediaQueryList`-shaped object with `matches: false` and no-op
  listeners), alongside the existing `scrollTo` / `scrollIntoView` stubs.
- The render helper can live in `src/test/` (e.g. `renderWithProviders`) and be adopted by
  `Layout.test.tsx` now; other suites can migrate opportunistically.

## Dependencies

### Requires

- None — this is the first thing to land in bolt `032`

### Enables

- `001-left-rail-navigation` (single-nav render via `useBreakpointValue`), and any later responsive test

## Edge Cases

| Scenario                                        | Expected Behavior                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| A suite that already renders without a provider | Keeps working — the polyfill is additive; provider wrapper is opt-in |

## Out of Scope

- Migrating every existing test to the new helper (opportunistic, not required here)
