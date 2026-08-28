---
intent: 002-kitchen-table-theme
phase: inception
status: complete
updated: 2026-08-28T16:00:00Z
---

# Kitchen Table Theme - Unit Decomposition

## Units Overview

This intent decomposes into a single unit — every FR here is presentation-layer work against the
same existing frontend, mirroring `001-weekly-dinner-planner`'s own single UI unit
(`003-weekly-dinner-planner-ui`) rather than splitting by sub-concern:

### Unit 1: 001-kitchen-table-ui

**Description**: Owns the entire theme adoption: design tokens (`theme.ts`), icon vocabulary (`icons.tsx`), the 3 structural navigation changes (bottom tab bar, filter chips + suppressed route, suppress-off-card-face), and every screen's restyle (Login, Catalog, This Week, Shopping List, Cooking, Suppressed, Store Config). No backend/schema work — this unit touches only `src/` frontend code.

**Stories**: TBD in story-create

**Deliverables**:

- `src/shared/theme/index.ts` (from `theme.ts`)
- `src/shared/components/icons.tsx` (from `icons.tsx`, extended)
- Google Fonts `<link>` tags in `index.html`; `lucide-react` dependency
- Recolored `public/icon.svg` + regenerated PWA PNGs
- `Layout.tsx` bottom tab bar; `CatalogFilters.tsx` → chip row; new Suppressed route; card overflow menu for suppress
- Restyled: `LoginForm.tsx`, `CatalogPage.tsx`/`DinnerCard.tsx`, `PlanPage.tsx` (incl. week nav), `ShoppingListPage.tsx`, `CookingViewPage.tsx`, the new Suppressed page, `StoreConfigPage.tsx`

**Dependencies**:

- Depends on: `001-weekly-dinner-planner` (all 4 units, complete) — restyles their existing frontend, adds no new backend surface
- Depended by: none

**Estimated Complexity**: L (touches nearly every existing frontend file, but each change is presentation-only, not new logic)

## Unit Dependency Graph

```text
[001-weekly-dinner-planner (all units, complete)] ──> [001-kitchen-table-ui]
```

## Execution Order

1. `001-kitchen-table-ui` (only unit — foundation stories block screen-restyle stories within it, see bolt plan)

## Requirement-to-Unit Mapping

- **FR-1** (Design Token Foundation) → `001-kitchen-table-ui`
- **FR-2** (Icon Vocabulary) → `001-kitchen-table-ui`
- **FR-3** (Bottom Tab Bar Navigation) → `001-kitchen-table-ui`
- **FR-4** (Filter Chips & Dedicated Suppressed Route) → `001-kitchen-table-ui`
- **FR-5** ("Not Interested" Off the Card Face) → `001-kitchen-table-ui`
- **FR-6** (Login Screen Restyle) → `001-kitchen-table-ui`
- **FR-7** (Catalog & Dinner Card Restyle) → `001-kitchen-table-ui`
- **FR-8** (This Week Restyle + Week Navigation) → `001-kitchen-table-ui`
- **FR-9** (Shopping List Restyle) → `001-kitchen-table-ui`
- **FR-10** (Cooking View Restyle) → `001-kitchen-table-ui`
- **FR-11** (Suppressed View Restyle) → `001-kitchen-table-ui`
- **FR-12** (Grocery Store Config Page Restyle) → `001-kitchen-table-ui`
