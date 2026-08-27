---
id: 003-bottom-tab-bar-navigation
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 003-bottom-tab-bar-navigation

## User Story

**As a** wife using the app on her phone
**I want** navigation at the bottom, within thumb's reach
**So that** I don't have to stretch to the top of the screen for every action

## Acceptance Criteria

- [ ] **Given** `Layout.tsx`, **When** viewed on phone-width, **Then** it renders `navItems` (Catalog, This week, List, Cooking) as 4 icon+label tabs in a bottom bar (`10px 12px 30px` padding, top hairline `line.subtle`, `justify-content: space-around`, 21px icons)
- [ ] **Given** the active route, **When** it matches a tab, **Then** that tab renders in `brand.500`
- [ ] **Given** the `/store-config` route, **When** the user wants to reach it, **Then** a small icon-button entry point exists in the Catalog header — not a 5th tab
- [ ] **Given** "Log out", **When** looking for it, **Then** it's reachable from the Catalog header or a small account sheet, not the tab bar
- [ ] **Given** the viewport is `md` breakpoint or wider, **When** the layout renders, **Then** the tab bar returns to a top bar

## Technical Notes

- All 5 existing routes (`/`, `/plan`, `/shopping-list`, `/cooking`, `/store-config`) stay exactly as they are — this story only changes nav chrome in `Layout.tsx`.
- Use Chakra responsive style props (`display={{ base: 'flex', md: 'none' }}` style pattern, matching `ux-guide.md`'s existing responsive convention) rather than a separate desktop component.

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`

### Enables

- `004-filter-chips-suppressed-route` (the Catalog header this story establishes is also where the Suppressed-route link and store-config entry point live)

## Edge Cases

| Scenario                                                                  | Expected Behavior                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A route with no matching tab is active (e.g. `/store-config`, Suppressed) | No tab is highlighted as active — acceptable, these are reached via header links, not tabs |

## Out of Scope

- The Catalog header's actual filter-chip content (→ `004-filter-chips-suppressed-route`)
