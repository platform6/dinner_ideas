---
id: 009-filter-chip-remove-affordance
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: could
created: '2026-08-28T17:10:00Z'
assigned_bolt: 024-frontend-review-ui
implemented: true
---

# Story: 009-filter-chip-remove-affordance

## User Story

**As a** household member
**I want** a real remove button on each active-filter chip
**So that** I can read a chip's label without the whole thing being a target, and the ✕ is a proper icon

## Acceptance Criteria

- [ ] **Given** `CatalogFilters.tsx`, **When** an active-filter chip renders, **Then** the remove control is `uiIcons.x` (a Lucide icon), not the text character `✕`
- [ ] **Given** a chip, **When** rendered, **Then** the label and the ✕ are distinct hit areas: clicking the label does nothing, clicking the ✕ removes that one filter
- [ ] **Given** multiple selected cuisines (from story `007`), **When** the chip row renders, **Then** each cuisine chip has its own ✕ that removes only that cuisine
- [ ] **Given** any tag chips shown in the same row, **When** rendered, **Then** they get the same treatment
- [ ] **Given** the change, **When** the suite runs, **Then** `CatalogFilters.test.tsx` targets the ✕ button (by role/label) for removal and passes

## Technical Notes

- `uiIcons.x` is already exported from `src/shared/components/icons.tsx`.
- Give the ✕ an accessible name (e.g. `aria-label={`Remove ${label} filter`}`) and a ≥ 44px padded
  hit area per `ux-guide.md`, even though it's visually small.
- Today the whole chip is `<Button onClick={remove}>{label} ✕</Button>` — split into a label element
  - an `IconButton`/`button` for the ✕ inside one chip container.

## Dependencies

### Requires

- `007-cuisine-filter-multi-select` (same file; the multi-cuisine chips are the main case) — same bolt, land `007` first

### Enables

- None

## Edge Cases

| Scenario                       | Expected Behavior                                     |
| ------------------------------ | ----------------------------------------------------- |
| Exactly one filter active      | Still label + own ✕; no special-casing                |
| Keyboard user tabs to the chip | Reaches the ✕ button; Enter/Space removes that filter |
| Long cuisine name              | Label truncates or wraps; ✕ stays fully clickable     |

## Out of Scope

- Changing which filters appear as chips
- The dropdown menus themselves (story `003`)
