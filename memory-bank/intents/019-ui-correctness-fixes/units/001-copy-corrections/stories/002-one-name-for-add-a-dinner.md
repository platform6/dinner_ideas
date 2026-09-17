---
id: 002-one-name-for-add-a-dinner
unit: 001-copy-corrections
intent: 019-ui-correctness-fixes
status: complete
priority: should
created: '2026-09-17T15:57:07Z'
assigned_bolt: null
implemented: true
---

# Story: 002-one-name-for-add-a-dinner

## User Story

**As a** household member
**I want** the button and the page it opens to use the same name
**So that** the app reads as one product

## Acceptance Criteria

- [ ] **Given** the catalog, **Then** the add button's visible text is "Add a dinner"
- [ ] Its aria-label (`CatalogPage.tsx:175`) and the entry page heading (`RecipeEntryPage.tsx:215`) are unchanged
- [ ] A test fails if a user-facing "Add dinner" string reappears in `src/`

## Technical Notes

- `CatalogPage.tsx:189`
- Check the button still fits at the narrowest supported width; "a " adds two characters

## Dependencies

- None
