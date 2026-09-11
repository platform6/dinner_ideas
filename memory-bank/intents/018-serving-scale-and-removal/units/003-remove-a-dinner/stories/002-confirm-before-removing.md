---
id: 002-confirm-before-removing
unit: 003-remove-a-dinner
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T18:25:00Z'
assigned_bolt: null
implemented: false
---

# Story: 002-confirm-before-removing

## User Story

**As a** household member
**I want** to be told what I am about to lose
**So that** I do not delete a dinner the family has cooked for a year by misclicking a menu

## Acceptance Criteria

- [ ] **Given** a removal, **When** requested, **Then** the user confirms before anything is deleted
- [ ] **Given** a dinner that appears in meal history or a plan, **When** removal is requested,
      **Then** the user is told what else it affects, and may proceed (warn, not refuse)
- [ ] **Given** the confirmation, **When** shown, **Then** it is clear this cannot be undone
- [ ] **Given** the catalog menu, **When** opened, **Then** "Not interested" remains the
      non-destructive option and is not confused with removal

## Technical Notes

- The catalog card menu currently holds only "Not interested" (`is_active = false`). The two need to
  read as clearly different things
- Intent 009's inline confirm pattern is the closest precedent for a destructive-ish confirm
