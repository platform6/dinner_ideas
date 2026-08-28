---
id: 033-desktop-layout-ui
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
type: simple-construction-bolt
status: complete
stories:
  - 004-shopping-list-two-column
  - 005-this-week-three-across
  - 006-store-setup-side-by-side
created: '2026-08-28T19:45:00Z'
started: '2026-08-28T20:02:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T20:04:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T20:10:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T20:12:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 032-desktop-layout-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-08-28T19:22:38Z'
---

# Bolt: 033-desktop-layout-ui

## Objective

The three screens that earn a real desktop shape: Shopping list → two columns + header controls at
md+; This week → three across at md+; Grocery store setup → side by side at md+. Below md, all three
are unchanged from intent `003`.

## Stories Included

- [ ] **004-shopping-list-two-column**: two CSS columns + lock/Copy into the header at md+ — Priority: Should
- [ ] **005-this-week-three-across**: `SimpleGrid columns={{ base: 1, md: 3 }}` with the pick-card spec — Priority: Should
- [ ] **006-store-setup-side-by-side**: `SimpleGrid columns={{ base: 1, md: 2 }}`, assignment rows → `layerStyle="card"` — Priority: Should

## Expected Outputs

- `src/features/shopping-list/components/ShoppingListPage.tsx`
- `src/features/weekly-plan/components/PlanPage.tsx`
- `src/features/store-config/components/StoreConfigPage.tsx`
- Updated tests for the three screens where an md+ assertion is added
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Requires

- **032-desktop-layout-ui** (Required): rail + measure cap + test infra (`useBreakpointValue` usable)

### Enables

- None

## Success Criteria

- [ ] md+: shopping list in two columns, no category split, actions in the header; below md the `003` sticky bar unchanged
- [ ] md+: This week three-across with the card spec; week arrows in the header; below md rows unchanged
- [ ] md+: Store setup side by side, capped 1080px, assignment rows `layerStyle="card"`; below md stacked
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green
- [ ] Code reviewed

## Notes

Independent of bolt `034`. The This-week photo slot ships as the empty `paper.sunken` tile.
