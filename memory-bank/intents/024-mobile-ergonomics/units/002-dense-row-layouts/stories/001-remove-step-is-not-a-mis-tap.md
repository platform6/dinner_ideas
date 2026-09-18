---
id: 001-remove-step-is-not-a-mis-tap
unit: 002-dense-row-layouts
intent: 024-mobile-ergonomics
status: complete
priority: must
created: '2026-09-18T13:10:36Z'
assigned_bolt: null
implemented: true
---

# Story: 001-remove-step-is-not-a-mis-tap

## User Story

**As a** household member editing a recipe on a phone
**I want** the remove button away from the reorder arrows
**So that** I don't delete a step while trying to move it

## Acceptance Criteria

- [ ] **Given** a phone, **Then** remove and both reorder arrows are each at least 44×44px
- [ ] Remove is separated from the reorder pair by position, not by colour alone
- [ ] Its accessible name still names the step ("Remove step 2")
- [ ] Removing a step still renumbers the rest with no gap
- [ ] No confirmation is added (Checkpoint 1)
- [ ] At md+ the row stays usable and is not made taller than it needs to be

## Technical Notes

- `CookingStepsEditor.tsx:88-107`; the three buttons are `size="xs"`, which has no theme entry
- Either give `xs` a theme size or use `sm`, which unit 001 has already made 44px on a phone

## Dependencies

- Unit `001-touch-target-size`
