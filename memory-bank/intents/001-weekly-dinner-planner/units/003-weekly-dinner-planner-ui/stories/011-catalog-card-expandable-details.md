---
id: 011-catalog-card-expandable-details
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-27T01:00:00Z'
assigned_bolt: 012-weekly-dinner-planner-ui
implemented: true
---

# Story: 011-catalog-card-expandable-details

## User Story

**As a** wife browsing the catalog
**I want** to expand a dinner's card to see its cooking steps and ingredients right there
**So that** I don't have to pick it just to see if it's something I actually want to make

## Acceptance Criteria

- [ ] **Given** a catalog card, **When** I click "Details", **Then** it expands in place to show ordered cooking steps and the full ingredient list (quantities + units)
- [ ] **Given** an expanded card, **When** I click "Details" again, **Then** it collapses
- [ ] **Given** two expanded cards, **When** I expand a third, **Then** the first two stay expanded (independent state per card)
- [ ] **Given** an expanded card, **When** filters/sort change or a selection is toggled elsewhere, **Then** the expand/collapse state is unaffected

## Technical Notes

- `DinnerCard.tsx` currently receives `dinner: DinnerWithIngredients` only — it needs `dinner_steps` too, so either widen the prop to `DinnerWithIngredients & DinnerWithSteps` or fetch steps lazily on first expand (lazy fetch avoids loading step content for every card up front; recommend this given catalog can be 50+ cards).
- Expand state is local component state (`useState<boolean>`), not persisted — resets on page reload, which is fine.
- Steps/ingredients rendering can reuse the same list styling as `CookingViewPage.tsx` for consistency rather than inventing a new layout.

## Dependencies

### Requires

- `003-dinner-step-by-step-instructions` (already complete — this story just surfaces that data in a new place)

### Enables

- `012-tag-management-ui` (shares the same expanded section)

## Edge Cases

| Scenario                                                                        | Expected Behavior                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A dinner with zero recorded steps (shouldn't happen post-seed, but defensively) | Details section shows the ingredient list and an empty/graceful steps area, not a crash |
| Expanding while the suppressed-dinners view is showing                          | Works the same in both `active` and `suppressed` card variants                          |

## Out of Scope

- Tag list/add/remove controls (→ `012-tag-management-ui`, same section but separate story)
