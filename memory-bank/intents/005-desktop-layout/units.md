---
intent: 005-desktop-layout
phase: inception
status: complete
updated: 2026-08-28T19:30:00Z
---

# Desktop Layout - Unit Decomposition

## Units Overview

One unit — every FR is presentation-layer work against the same existing frontend, the same
single-UI-unit shape as `002` and `003`.

### Unit 1: 001-desktop-layout-ui

**Description**: Owns the whole desktop layer — the `Layout.tsx` rail replacement + measure cap,
login centring, the three `md+` screen reshapes (shopping list, this week, store setup), the
catalog breakpoint move, pointer-hover states, and the test infrastructure (`matchMedia` polyfill,
`ChakraProvider` render helper, `Layout.test.tsx` rewrite). Touches only `src/` frontend code.

**Unit Type**: frontend
**Default Bolt Type**: simple-construction-bolt

**Deliverables**:

- `src/shared/components/Layout.tsx` (from `Layout.reference.tsx`, single-nav via `useBreakpointValue`)
- `src/shared/components/Layout.test.tsx` (rewritten)
- `src/test/setup.ts` (`matchMedia` polyfill) + a `ChakraProvider` render helper
- `src/features/auth/LoginForm.tsx` (vertical centring at md+)
- `src/features/shopping-list/components/ShoppingListPage.tsx` (2-col at md+, header controls, row hover)
- `src/features/weekly-plan/components/PlanPage.tsx` (`SimpleGrid` 3-across at md+)
- `src/features/store-config/components/StoreConfigPage.tsx` (`SimpleGrid` side-by-side at md+, assignment rows → `layerStyle="card"`)
- `src/features/dinners/components/CatalogPage.tsx` (`columns={{ base:1, sm:2, xl:3 }}`)
- `src/features/dinners/components/DinnerCard.tsx` + `src/features/cooking-view/components/CookingViewPage.tsx` (hover states)

**Dependencies**:

- Depends on: `003-frontend-review-remediation` (complete) — corrected ink ramp, `line.brandSubtle`,
  finding-3 sticky-bar fix
- Depended by: none

**Estimated Complexity**: M–L — many files, but each change is a bounded responsive branch; the
only genuinely new component is the rail (supplied as `Layout.reference.tsx`).

## Unit Dependency Graph

```text
[003-frontend-review-remediation (complete)] ──> [001-desktop-layout-ui]
```

## Execution Order

1. `001-desktop-layout-ui` (only unit — bolt sequence orders the work: the rail + test infra land
   before the screen reshapes that assume them)

## Requirement-to-Unit Mapping

- **FR-1** (Left rail nav) → `001-desktop-layout-ui`
- **FR-2** (Measure cap) → `001-desktop-layout-ui`
- **FR-3** (Login centring) → `001-desktop-layout-ui`
- **FR-4** (Shopping list 2-col) → `001-desktop-layout-ui`
- **FR-5** (This week 3-across) → `001-desktop-layout-ui`
- **FR-6** (Store setup side-by-side) → `001-desktop-layout-ui`
- **FR-7** (Catalog xl breakpoint) → `001-desktop-layout-ui`
- **FR-8** (Pointer states) → `001-desktop-layout-ui`
- **FR-9** (Test infrastructure) → `001-desktop-layout-ui`
