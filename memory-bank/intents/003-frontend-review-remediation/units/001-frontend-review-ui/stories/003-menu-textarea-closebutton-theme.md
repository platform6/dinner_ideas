---
id: 003-menu-textarea-closebutton-theme
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: must
created: '2026-08-28T17:10:00Z'
assigned_bolt: 023-frontend-review-ui
implemented: true
---

# Story: 003-menu-textarea-closebutton-theme

## User Story

**As a** household member
**I want** the dropdown menus, the clipboard textarea and the tag close buttons to match the rest of the app
**So that** a stock white panel with a blue focus ring doesn't appear on a warm olive page

## Acceptance Criteria

- [ ] **Given** `src/shared/theme/index.ts`, **When** the three entries from `theme-patch.ts` §3 are added to `components`, **Then** `Menu`, `Textarea` and `CloseButton` each have the entry as written
- [ ] **Given** the dinner-card overflow menu, the Cuisine dropdown and the Tags dropdown, **When** opened, **Then** each renders a `paper.base` panel, `line.subtle` hairline, `card` radius, `raised` shadow, and olive (not blue) focus/hover on items
- [ ] **Given** the shopping-list clipboard fallback `Textarea`, **When** rendered, **Then** it uses the `filled` variant by default: `paper.subtle` bg, `line.brandSubtle` border, `field` radius
- [ ] **Given** a tag chip's `CloseButton` in the card Details panel, **When** rendered, **Then** it is `ink.400` → `ink.700` on hover, `chip` radius, and `sm` = 16px
- [ ] **Given** the change, **When** the suite runs, **Then** only assertions that pinned Chakra defaults need updating

## Technical Notes

- `theme-patch.ts` §3 is a single `menuTheme` object exporting `Menu`, `Textarea`, `CloseButton` —
  spread its three keys into the theme's `components`.
- `Textarea.defaultProps.variant = 'filled'` is part of the block; confirm no call site passes an
  explicit variant that would now be overridden unexpectedly.
- `line.brandSubtle` (story `005`) is referenced by the `Textarea` border — same-bolt ordering.

## Dependencies

### Requires

- `005-name-brand-subtle-hairline` (Textarea border) — same bolt

### Enables

- `007-cuisine-filter-multi-select` renders inside the now-themed Cuisine/Tags `Menu` (soft — ordering only)

## Edge Cases

| Scenario                              | Expected Behavior                                         |
| ------------------------------------- | --------------------------------------------------------- |
| A `Menu` elsewhere not yet audited    | Also picks up the base style — verify it still reads well |
| `CloseButton` used at a non-`sm` size | Base style applies; only `sm` gets the explicit 16px      |

## Out of Scope

- `Select` (already has an override from `002-kitchen-table-theme`)
- Restructuring any menu's contents
