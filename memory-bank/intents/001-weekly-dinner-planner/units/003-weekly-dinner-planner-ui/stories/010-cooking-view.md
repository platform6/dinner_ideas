---
id: 010-cooking-view
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T19:43:10Z'
assigned_bolt: null
implemented: true
---

# Story: 010-cooking-view

## User Story

**As a** wife about to cook one of this week's dinners
**I want** a dedicated page showing all 3 picked dinners with clear, step-by-step instructions
**So that** I can follow along easily while cooking, separate from the shopping list

## Acceptance Criteria

- [ ] **Given** the current plan has exactly 3 dinners selected, **When** I visit the cooking view, **Then** I see all 3 dinners, each with its instructions rendered as an ordered, numbered list of steps (not a paragraph)
- [ ] **Given** the plan has fewer than 3 selections, **When** I visit the cooking view, **Then** I see a clear empty/prompt state instead of a broken or partial view
- [ ] **Given** the cooking view and the shopping list, **When** I navigate the app, **Then** they are reachable as separate pages/routes, not tabs on one screen
- [ ] **Given** the plan is later locked, **When** I revisit the cooking view, **Then** it still shows the same 3 dinners' steps (locking doesn't hide or change this view)

## Technical Notes

- Reads `dinner_steps` (from `001-dinner-catalog` bolt `007-dinner-catalog`) for each of the plan's 3 dinners, ordered by `step_number`.
- New route, e.g. `/cooking`, added via `react-router-dom` alongside `/` (catalog), `/plan`, and `/shopping-list`.
- Reuses the "current plan's 3 dinners" data already fetched for the shopping list / plan view where practical, to avoid a duplicate round-trip.

## Dependencies

### Requires
- `003-dinner-step-by-step-instructions` (from `001-dinner-catalog`, bolt `007-dinner-catalog`) — needs real step data to display
- `004-editable-until-locked` — needs the current plan's selected dinners

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| A dinner somehow has zero steps (data gap) | Show that dinner's card with a fallback note rather than a blank/broken section |
| No current plan exists at all (first-ever visit) | Same empty/prompt state as "fewer than 3 selections" |

## Out of Scope

- Editing steps/recipes (future work, FR-6)
- Marking steps as done / progress tracking (not requested)
