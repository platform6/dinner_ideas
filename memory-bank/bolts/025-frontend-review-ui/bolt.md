---
id: 025-frontend-review-ui
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 006-shopping-list-action-bar
  - 008-card-layerstyles-three-screens
created: '2026-08-28T17:10:00Z'
started: '2026-08-28T19:15:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T19:15:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T19:20:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T19:22:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 023-frontend-review-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
completed: '2026-08-28T19:04:38Z'
---

# Bolt: 025-frontend-review-ui

## Objective

Per-screen call-site cleanups that don't touch the theme file: fix the shopping-list sticky action
bar (clear the tab bar on phone, relocate the lock + Copy controls to the header at md+) and switch
Plan / Suppressed / Cooking to the shared `card` layerStyles.

## Stories Included

- [ ] **006-shopping-list-action-bar**: `bottom={{ base:'70px', md:0 }}`, drop `pb={20}`, md+ header controls — Priority: Should
- [ ] **008-card-layerstyles-three-screens**: `layerStyle="card"` / `"cardSelected"` on PlanPage, SuppressedPage, CookingViewPage — Priority: Could

## Expected Outputs

- `src/features/shopping-list/components/ShoppingListPage.tsx` — sticky `bottom` responsive value, `pb={20}` removed, md+ header `HStack`
- `src/features/weekly-plan/components/PlanPage.tsx`, `src/features/dinners/components/SuppressedPage.tsx`, `src/features/cooking-view/components/CookingViewPage.tsx` — hand-rolled cards → layerStyle
- Updated `ShoppingListPage` tests and any tests pinning the old inline card props
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- **023-frontend-review-ui** (Required): `008` consumes `line.brandSubtle` / the themed `card` layerStyle; run after the foundation

### Unit Dependencies (cross-unit)

- `002-kitchen-table-theme` — complete (owns these screens)

### Enables

- None — but `004-desktop-layout`'s shopping-list reshape builds on the md+ header layout landed here

## Success Criteria

- [ ] Phone: lock checkbox + Copy button fully above the 70px tab bar, no clipping, single bottom padding
- [ ] md+: sticky footer gone; both controls right-aligned in the page header; lock/copy behaviour unchanged
- [ ] PlanPage / SuppressedPage / CookingViewPage use `layerStyle="card"`; no hand-rolled card defs remain
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; suite green with updated assertions
- [ ] Code reviewed

## Notes

The md+ two-column shopping-list category flow is **not** here — that's intent `004`. Independent of
bolt `024`.
