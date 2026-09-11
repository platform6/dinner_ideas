---
id: 003-no-more-hardcoded-three
unit: 001-serving-size-setting
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T16:24:16Z'
assigned_bolt: null
implemented: false
---

# Story: 003-no-more-hardcoded-three

## User Story

**As a** household that cooks for five
**I want** the app to stop telling me quantities are for three
**So that** the guidance matches what I actually set

## Acceptance Criteria

- [ ] **Given** a household with serving size N, **When** the entry form is shown, **Then** the
      ingredients guidance names N, not 3
- [ ] **Given** a household with serving size N, **When** an extraction runs, **Then** the prompt
      carries N, not 3
- [ ] **Given** the codebase, **When** searched, **Then** no user-visible "3 servings" literal
      remains
- [ ] **Given** the setting changes, **When** the form is re-rendered, **Then** the guidance changes
      with it — asserted on the RENDERED text, not on a constant

## Technical Notes

- Known sites: `prompt.ts` (the servings rule and the worked example's framing) and
  `IngredientLinesEditor.tsx:64`. A grep is required rather than trusting this list
