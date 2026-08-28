---
id: 016-rename-filter-menu-cuisine
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 020-weekly-dinner-planner-ui
implemented: true
---

# Story: 016-rename-filter-menu-cuisine

## User Story

**As a** household member filtering the dinner catalog
**I want** the "More" filter menu renamed to "Cuisine"
**So that** the button says what it actually does instead of a vague catch-all label

## Acceptance Criteria

- [ ] **Given** the catalog filter row, **When** the overflow filter menu renders, **Then** its button text reads "Cuisine" (was "More").
- [ ] **Given** assistive tech reads the button, **When** it announces the control, **Then** the `aria-label` reads "Cuisine" (was "More filters").
- [ ] **Given** the "Cuisine" menu is open, **When** it renders, **Then** it contains only the cuisine checkbox list — no tag checkboxes (those moved to story `015`).
- [ ] **Given** I pick a cuisine from the menu, **When** the selection changes, **Then** behaviour is exactly as today: single-select, results filter, and the choice shows as a removable `cuisine ✕` chip.
- [ ] **Given** the always-inline "All" and "Quickest" controls, **When** this change ships, **Then** they are unchanged in label and behaviour.

## Technical Notes

- Single file: `src/features/dinners/components/CatalogFilters.tsx` — the `MenuButton` text (`More`) and its `aria-label` (`More filters`), currently around lines 77-80.
- The `leftIcon` (`uiIcons.filters`) can stay or switch to a more cuisine-appropriate icon from `icons.tsx` — cosmetic, not required by acceptance criteria.
- This story and `015` touch the same component; expect them delivered together in bolt `020`.
- Update any test that asserts on the "More" / "More filters" strings.

## Dependencies

### Requires

- None

### Enables

- None

## Edge Cases

| Scenario                                                       | Expected Behavior                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Zero cuisines in the catalog                                   | Existing conditional already hides the menu when there is nothing to show; unchanged |
| A test elsewhere queries the button by its old accessible name | Update that test to the new name as part of this story                               |

## Out of Scope

- Renaming the underlying `filters.cuisine` state field or the `cuisine_type` column
- Relabelling "cuisine" anywhere else in the app (catalog cards, plan rows) — this story is the filter control only
- The tag dropdown split (story `015`)
