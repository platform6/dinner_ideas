---
id: 012-store-config-restyle
unit: 001-kitchen-table-ui
intent: 002-kitchen-table-theme
status: complete
priority: should
created: '2026-08-27T09:20:00Z'
assigned_bolt: null
implemented: true
---

# Story: 012-store-config-restyle

## User Story

**As a** wife setting up her store layout
**I want** the config page to feel like the rest of the app
**So that** it doesn't feel like a bolted-on admin screen

## Acceptance Criteria

- [ ] **Given** `StoreConfigPage.tsx`'s row list, **When** rendered, **Then** each row uses the same card/list-row convention as other screens (e.g. This Week's numbered rows)
- [ ] **Given** the up/down/delete controls, **When** rendered, **Then** they use icons from `002-icon-vocabulary`'s extended store-config entries
- [ ] **Given** the add-row input, **When** rendered, **Then** it matches the filled-input convention from `001-design-token-foundation`
- [ ] **Given** the category-assignment selects, **When** rendered, **Then** they match the theme's `Select` component override

## Technical Notes

- No pixel reference exists for this screen (it postdates the handoff) — this story extrapolates from the established conventions rather than matching a specific mockup, per the "extrapolate the theme" decision. Lower priority than the 6 originally-designed screens accordingly.
- Behavior (`useRows`, `useReorderRow`, `useAddRow`, `useDeleteRow`, `useAssignCategory`) is completely unchanged.

## Dependencies

### Requires

- `001-design-token-foundation`, `002-icon-vocabulary`

### Enables

- None

## Edge Cases

| Scenario               | Expected Behavior                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| No rows configured yet | Same "shopping list will use alphabetical order until you add some" message as today, restyled |

## Out of Scope

- Any other screen
