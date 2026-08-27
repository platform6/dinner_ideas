---
id: 010-cooking-view-restyle
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: must
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 010-cooking-view-restyle

## User Story

**As a** wife actually cooking
**I want** each dinner's steps as a clear, collapsible card
**So that** I can glance at just the dinner I'm working on right now

## Acceptance Criteria

- [ ] **Given** `CookingViewPage.tsx`, **When** rendered collapsed, **Then** each dinner shows a 44px photo-placeholder thumb, Lora title, `Clock` + cook-time + step-count, and a `ChevronDown`
- [ ] **Given** a card is expanded, **When** rendered, **Then** it fills `brand.50`, shows `ChevronUp`, and lists steps as 30px `paper.base` tiles with a leading `stepIcon` beside the instruction text — replacing the plain `OrderedList`
- [ ] **Given** multiple cards, **When** one is expanded, **Then** only the tapped card toggles — others' expand state is independent (several may be open at once)

## Technical Notes

- `useDinnersWithSteps` is unchanged — this story only restyles how `dinner_steps` are rendered, replacing `OrderedList`/`ListItem` with the icon-tile layout.
- `stepIcon(instruction)` (from `002-icon-vocabulary`) already exists for exactly this purpose.

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`

### Enables

- None

## Edge Cases

| Scenario                         | Expected Behavior                                                  |
| -------------------------------- | ------------------------------------------------------------------ |
| A dinner has zero recorded steps | Same graceful "No steps available" message as today, just restyled |

## Out of Scope

- Any other screen
