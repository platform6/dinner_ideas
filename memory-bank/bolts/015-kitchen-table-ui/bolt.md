---
id: 015-kitchen-table-ui
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
type: simple-construction-bolt
status: planned
stories:
  - 003-bottom-tab-bar-navigation
  - 004-filter-chips-suppressed-route
  - 005-suppress-off-card-face
created: '2026-08-27T09:30:00Z'
requires_bolts:
  - 014-kitchen-table-ui
enables_bolts:
  - 016-kitchen-table-ui
  - 018-kitchen-table-ui
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 015-kitchen-table-ui

## Overview

The 3 structural navigation changes: bottom tab bar, filter chips + a dedicated Suppressed route, and moving "Not interested" off the card face into an overflow menu.

## Objective

Land the phone-first navigation restructure the handoff calls out as a cohesive set, before restyling individual screens.

## Stories Included

- **003-bottom-tab-bar-navigation**: Bottom tab bar navigation (Must)
- **004-filter-chips-suppressed-route**: Filter chips & suppressed route (Must)
- **005-suppress-off-card-face**: Suppress off card face (Must)

## Bolt Type

**Type**: Simple Construction Bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. Plan**
- [ ] **2. Implement**
- [ ] **3. Test**

## Dependencies

### Requires

- **014-kitchen-table-ui** (Required): Needs the theme/icon vocabulary

### Enables

- **016-kitchen-table-ui**: Story `007` (Catalog card) depends on `004`'s chip row
- **018-kitchen-table-ui**: Story `011` (Suppressed view) depends on `004`'s new route

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

`CatalogPage.tsx` loses its `showSuppressed` conditional entirely in this bolt — the Suppressed view's own content lands in bolt `018` (story `011`), so this bolt's route will briefly render a placeholder/stub until then, unless sequenced to land together.
