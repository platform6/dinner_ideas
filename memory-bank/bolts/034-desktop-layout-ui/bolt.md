---
id: 034-desktop-layout-ui
unit: 001-desktop-layout-ui
intent: 005-desktop-layout
type: simple-construction-bolt
status: complete
stories:
  - 007-catalog-xl-third-column
  - 008-pointer-hover-states
created: '2026-08-28T19:45:00Z'
started: '2026-08-28T20:15:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T20:15:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T20:20:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T20:22:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 032-desktop-layout-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
completed: '2026-08-28T19:24:52Z'
---

# Bolt: 034-desktop-layout-ui

## Objective

The catalog breakpoint move (3rd column waits for `xl`) plus the pointer/hover states the phone
build never needed.

## Stories Included

- [ ] **007-catalog-xl-third-column**: `columns={{ base: 1, sm: 2, xl: 3 }}`, page capped 1080px — Priority: Could
- [ ] **008-pointer-hover-states**: card hover border, clickable shopping-list rows + hover, cooking accordion cursor/hover — Priority: Could

## Expected Outputs

- `src/features/dinners/components/CatalogPage.tsx` — `lg: 3` → `xl: 3`
- `src/features/dinners/components/DinnerCard.tsx` — `_hover` border
- `src/features/shopping-list/components/ShoppingListPage.tsx` — row wrapped in the checkbox label + `_hover` bg
- `src/features/cooking-view/components/CookingViewPage.tsx` — accordion header `cursor` + `borderColor` hover
- Updated tests where a row is now clickable from its text
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Requires

- **032-desktop-layout-ui** (Required): measure cap (`/` → 1080px)

### Enables

- None (last bolt of the intent)

## Success Criteria

- [ ] Catalog 3rd column at `xl` only; page capped 1080px
- [ ] `DinnerCard` hover = `line.brand` border, no bg change
- [ ] Shopping-list item rows toggle the checkbox from anywhere on the line, with a `paper.subtle` hover
- [ ] Cooking accordion header shows a pointer cursor and a border shift on hover
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green
- [ ] Code reviewed

## Notes

Global focus ring already shipped in intent `003` bolt `023` — this bolt is hover/cursor only.
Independent of bolt `033`.
