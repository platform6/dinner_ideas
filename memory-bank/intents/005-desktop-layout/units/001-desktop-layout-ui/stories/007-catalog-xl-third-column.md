---
id: 007-catalog-xl-third-column
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
status: complete
priority: could
created: '2026-08-28T19:30:00Z'
assigned_bolt: 034-desktop-layout-ui
implemented: true
---

# Story: 007-catalog-xl-third-column

## User Story

**As a** household member browsing the catalog on a laptop
**I want** the third column to wait until the window is genuinely wide
**So that** the dinner card — designed as a row — isn't squeezed 3-up at 992px, stretching its Pick / Details footer

## Acceptance Criteria

- [ ] **Given** `CatalogPage.tsx`, **When** the grid renders, **Then** it is
      `<SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>` (was `lg: 3`)
- [ ] **Given** md+, **When** the catalog renders, **Then** the page content is capped at 1080px
      (via `WIDE_ROUTES` containing `/`)
- [ ] **Given** the change, **When** the suite runs, **Then** `CatalogPage` tests pass

## Technical Notes

- One-line change at `CatalogPage.tsx:122`: `lg: 3` → `xl: 3`.
- The 1080px cap comes from story `002`'s `WIDE_ROUTES` — no per-page work.

## Dependencies

### Requires

- `002-content-measure-cap`

### Enables

- None

## Edge Cases

| Scenario              | Expected Behavior               |
| --------------------- | ------------------------------- |
| 1024px window (`lg`)  | 2 columns, not 3                |
| 1280px+ window (`xl`) | 3 columns within the 1080px cap |

## Out of Scope

- Master-detail catalog split (explicitly out per the README)
