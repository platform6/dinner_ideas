---
id: 003-scale-control-on-review
unit: 002-scale-on-review
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T18:25:00Z'
assigned_bolt: null
implemented: false
---

# Story: 003-scale-control-on-review

## User Story

**As a** household member reviewing an import
**I want** to scale the recipe to us, or not
**So that** a tray of bark stays a tray and a dinner for eight becomes a dinner for us

## Acceptance Criteria

- [ ] **Given** an imported draft whose source stated a count, **When** reviewing, **Then** a
      control offers to scale, naming BOTH numbers ("from 8 to 5")
- [ ] **Given** the control, **When** applied, **Then** the quantities change visibly and the change
      can be undone without re-importing
- [ ] **Given** a source that stated a range, **When** the user scales, **Then** they supply the
      base; the app does not pick a number out of the range
- [ ] **Given** a source that stated no count, **When** reviewing, **Then** scaling is not offered
      from an unknown base, and the form says why
- [ ] **Given** a draft, **When** the user saves without touching the control, **Then** the source's
      quantities are what is saved

## Technical Notes

- Bolt 062 already renders a caveat when the source gave no serving count; this control belongs
  beside it, in `IngredientLinesEditor`'s header area
- The manual-entry path has no source count and so never shows this control
