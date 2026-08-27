---
id: 008-this-week-restyle-week-nav
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: planned
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: false
---

# Story: 008-this-week-restyle-week-nav

## User Story

**As a** wife checking this week's plan
**I want** a calm summary of my picks, and easy arrows to look at other weeks
**So that** the plan feels finished, not like a half-built list

## Acceptance Criteria

- [ ] **Given** `PlanPage.tsx`, **When** rendered, **Then** the eyebrow shows the week's date range and the title reads "This week's plan"
- [ ] **Given** each selection, **When** rendered, **Then** it's a `brand.50` row: a 34px olive numbered tile (1/2/3), name + metadata, and a 36px outline icon button with `X` to remove
- [ ] **Given** all 3 dinners are picked, **When** rendered, **Then** a dashed card closes the list: `Sparkles` icon, "All three picked. Your shopping list is ready.", and an olive "See shopping list" button with `ShoppingBasket`
- [ ] **Given** the week-navigation controls (added in the prior enhancement round, not in the original handoff), **When** rendered, **Then** they use the ◀/▶ icons from `002-icon-vocabulary` at the header, alongside the date-range title
- [ ] **Given** a past, locked week, **When** viewed, **Then** it shows an "Eaten" badge using the icon chosen in `002-icon-vocabulary`
- [ ] **Given** a skipped week (no plan), **When** viewed, **Then** its empty state uses the same dashed-card convention as the all-picked/locked states, not a plain text message

## Technical Notes

- Behavior (`useWeekByOffset`, `useToggleSelection`, `useCurrentPlan`) is completely unchanged — this story only restyles `PlanPage.tsx`'s markup.
- The "Eaten" badge and empty-state dashed card are new relative to the handoff's own spec (it only documents the current/unlocked week) — extrapolated per the "extrapolate the theme" decision.

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`

### Enables

- None

## Edge Cases

| Scenario                                                                                         | Expected Behavior                                                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| A past week has fewer than 3 selections (shouldn't normally happen once locked, but defensively) | Row list just renders however many selections exist — no assumption of exactly 3 |

## Out of Scope

- Any other screen
