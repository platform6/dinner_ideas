---
id: 007-cuisine-filter-multi-select
unit: 001-frontend-review-ui
intent: 003-frontend-review-remediation
status: complete
priority: should
created: '2026-08-28T17:10:00Z'
assigned_bolt: 024-frontend-review-ui
implemented: true
---

# Story: 007-cuisine-filter-multi-select

## User Story

**As a** household member browsing the catalog
**I want** to filter by more than one cuisine at once
**So that** ticking a second cuisine doesn't silently untick the first

## Acceptance Criteria

- [ ] **Given** `CatalogFilters.tsx`, **When** the type is updated, **Then** `CatalogFilterState.cuisine` is `string[]` (was `string | null`)
- [ ] **Given** `filters.ts`, **When** filtering, **Then** a dinner matches if its cuisine is in the selected array (OR); an empty array applies no cuisine filter — the same shape as `filters.tags`
- [ ] **Given** `CatalogPage.tsx`, **When** it initialises filter state, **Then** `cuisine: []`
- [ ] **Given** the cuisine `CheckboxGroup`, **When** two cuisines are ticked, **Then** dinners of either appear, and unticking one leaves the other active (the `values[values.length - 1]` last-wins line is gone)
- [ ] **Given** the "All" / clear affordance, **When** activated, **Then** `cuisine` resets to `[]`
- [ ] **Given** the active-filter chip row, **When** multiple cuisines are selected, **Then** it renders one chip per selected cuisine
- [ ] **Given** the change, **When** the suite runs, **Then** `filters.test.ts`, `CatalogFilters.test.tsx` and any `CatalogPage` filter test are updated to the array shape and pass

## Technical Notes

- Mirror `filters.tags` throughout — it already does exactly this (`string[]`, OR, chip-per-value).
- Current bug is `CatalogFilters.tsx:91`: `cuisine: (values[values.length - 1] as string) ?? null`.
  Replace with `cuisine: values as string[]`.
- Current reads to update: `filters.cuisine === null` (L43), `filters.cuisine !== null` (L59),
  `filters.cuisine ? [filters.cuisine] : []` (L89), the clear handler (L45, L60).
- `CatalogFilters.test.tsx` currently asserts `cuisine: 'Mexican'` / `cuisine: null` — becomes
  `cuisine: ['Mexican']` / `cuisine: []`.
- In-memory only — there is no URL or `localStorage` filter state to migrate.

## Dependencies

### Requires

- Themed Cuisine/Tags `Menu` from `003-menu-textarea-closebutton-theme` (soft — bolt `024` runs after `023`)

### Enables

- `009-filter-chip-remove-affordance` operates on the now-multiple cuisine chips

## Edge Cases

| Scenario                                  | Expected Behavior                                         |
| ----------------------------------------- | --------------------------------------------------------- |
| All cuisines ticked                       | Equivalent to no cuisine filter (every dinner shown)      |
| A dinner with a null/blank `cuisine_type` | Never matches a non-empty cuisine filter                  |
| Combined with an active tag filter        | Cuisine OR-set AND tag OR-set — same as tags behave today |

## Out of Scope

- Persisting filter selections
- Changing how the Tags filter works (it's already the reference pattern)
