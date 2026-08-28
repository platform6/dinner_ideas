---
id: 024-frontend-review-ui
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
type: simple-construction-bolt
status: complete
stories:
  - 007-cuisine-filter-multi-select
  - 009-filter-chip-remove-affordance
created: '2026-08-28T17:10:00Z'
started: '2026-08-28T19:05:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-08-28T19:05:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-08-28T19:10:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-08-28T19:12:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 023-frontend-review-ui
enables_bolts: []
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
completed: '2026-08-28T18:58:07Z'
---

# Bolt: 024-frontend-review-ui

## Objective

The catalog-filter changes: make cuisine genuinely multi-select (`cuisine: string[]`, OR semantics,
mirroring `filters.tags`) and give each active-filter chip a real `uiIcons.x` remove button with
its own hit area. Both live in `CatalogFilters.tsx` / `filters.ts` and the chip work rides on the
multi-cuisine chips, so they ship together.

## Stories Included

- [ ] **007-cuisine-filter-multi-select**: `CatalogFilterState.cuisine` → `string[]`, OR in `filters.ts`, one chip per cuisine — Priority: Should
- [ ] **009-filter-chip-remove-affordance**: `uiIcons.x` glyph, label and ✕ as separate hit areas — Priority: Could

Implement `007` first; `009` operates on its chips.

## Expected Outputs

- `src/features/dinners/components/CatalogFilters.tsx` — multi-value `CheckboxGroup`, chip-per-cuisine, split label/✕
- `src/features/dinners/filters.ts` — cuisine OR match, empty array = no filter
- `src/features/dinners/components/CatalogPage.tsx` — initial `cuisine: []`
- Updated `filters.test.ts`, `CatalogFilters.test.tsx`, any `CatalogPage` filter test
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- **023-frontend-review-ui** (Required): the Cuisine/Tags dropdown is themed there; `uiIcons.x` usage follows the theme foundation

### Unit Dependencies (cross-unit)

- `002-kitchen-table-theme` — complete (owns `CatalogFilters.tsx`, `uiIcons`)

### Enables

- None

## Success Criteria

- [ ] Ticking two cuisines shows dinners of either; unticking one leaves the other active
- [ ] "All" / clear resets `cuisine` to `[]`
- [ ] Each active-filter chip: label is not a button; a distinct `uiIcons.x` removes only that filter
- [ ] `filters.test.ts` / `CatalogFilters.test.tsx` updated to the array shape and green
- [ ] `npx tsc -b`, `eslint`, `vite build` clean
- [ ] Code reviewed

## Notes

In-memory filter state only — no URL / `localStorage` layer exists to migrate. Independent of bolt
`025`.
