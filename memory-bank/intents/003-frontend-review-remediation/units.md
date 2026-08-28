---
intent: 003-frontend-review-remediation
phase: inception
status: complete
updated: 2026-08-28T19:25:00Z
---

# Frontend Review Remediation - Unit Decomposition

## Units Overview

One unit. Every FR is presentation-layer work against the same existing frontend — the same
single-UI-unit shape as `002-kitchen-table-theme`'s `001-kitchen-table-ui`. There is no backend
surface: FR-5's filter-logic change lives in `src/features/dinners/filters.ts`, client-side.

### Unit 1: 001-frontend-review-ui

**Description**: Owns the whole remediation — the `theme-patch.ts` application (ink ramp, Alert
palette, Menu/Textarea/CloseButton entries, `line.brandSubtle`, global focus ring) plus the
component call-site fixes (shopping-list action bar, cuisine multi-select, `card` layerStyles on
three screens, filter-chip remove affordance). Touches only `src/` frontend code.

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/shared/theme/index.ts` — corrected `ink` block; new `line.brandSubtle`; `Alert` entry;
  `Menu` / `Textarea` / `CloseButton` entries; `styles.global` focus ring; `Button` baseStyle drops
  its private ring
- `src/features/shopping-list/components/ShoppingListPage.tsx` — sticky `bottom={{ base:'70px', md:0 }}`,
  drop `pb={20}`, relocate lock + Copy controls to the header at md+
- `src/features/dinners/filters.ts` + `src/features/dinners/components/CatalogFilters.tsx` +
  `src/features/dinners/components/CatalogPage.tsx` — `cuisine: string[]`, OR semantics, one chip
  per selected cuisine, `uiIcons.x` remove button with its own hit area
- `src/features/weekly-plan/components/PlanPage.tsx`,
  `src/features/dinners/components/SuppressedPage.tsx`,
  `src/features/cooking-view/components/CookingViewPage.tsx` — `layerStyle="card"` / `"cardSelected"`
  in place of hand-rolled cards; `CookingViewPage.tsx` also drops its `#E3E7DA` literal
- Updated tests for `ShoppingListPage`, `CatalogFilters` / `filters` / `CatalogPage`

**Dependencies**:

- Depends on: `002-kitchen-table-theme` (complete) — this remediates that intent's shipped output
- Depended by: `004-desktop-layout` — needs the corrected ink ramp, `line.brandSubtle`, and FR-2's
  sticky-bar fix in place first

**Estimated Complexity**: M — many files, but each change is small and mechanical; only FR-5 carries
real logic, and it has a working sibling pattern (`filters.tags`)

## Unit Dependency Graph

```text
[002-kitchen-table-theme (complete)] ──> [001-frontend-review-ui] ──> (004-desktop-layout)
```

## Execution Order

1. `001-frontend-review-ui` (only unit — bolt sequence below orders the work: theme foundation
   before the call-site fixes that depend on it)

## Requirement-to-Unit Mapping

- **FR-1** (Ink ramp AA correction) → `001-frontend-review-ui`
- **FR-2** (Shopping-list action bar) → `001-frontend-review-ui`
- **FR-3** (Alert palette) → `001-frontend-review-ui`
- **FR-4** (Menu / Textarea / CloseButton theme entries) → `001-frontend-review-ui`
- **FR-5** (Cuisine filter multi-select) → `001-frontend-review-ui`
- **FR-6** (`line.brandSubtle`) → `001-frontend-review-ui`
- **FR-7** (`card` layerStyles on Plan / Suppressed / Cooking) → `001-frontend-review-ui`
- **FR-8** (Filter-chip remove affordance) → `001-frontend-review-ui`
- **FR-9** (Global focus ring) → `001-frontend-review-ui`
