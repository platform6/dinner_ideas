---
id: 007-manual-entry-tests
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 060-recipe-save
implemented: false
---

# Story: 007-manual-entry-tests

## User Story

**As a** future maintainer
**I want** the entry path covered where it is genuinely risky to be wrong
**So that** the catalog's first write path does not quietly start producing malformed dinners

## Acceptance Criteria

- [ ] **Given** the validation rules, **When** tested, **Then** cases cover: zero ingredients, zero
      steps, non-positive cook time, non-positive quantity, and a blank step — each refused before
      any network call.
- [ ] **Given** step renumbering, **When** a middle step is removed, **Then** a case asserts the
      remaining steps are contiguous from 1.
- [ ] **Given** a successful save, **When** tested, **Then** cases assert all three tables are
      written with the draft's contents, and that `step_number` matches the displayed order.
- [ ] **Given** a failing save, **When** tested, **Then** a case asserts no partial dinner survives
      — whichever mechanism 005's ADR chose.
- [ ] **Given** a duplicate name, **When** tested, **Then** a case asserts a plain-language message
      and that the draft is preserved.
- [ ] **Given** the category options, **When** tested, **Then** a case asserts they come from the
      shared `INGREDIENT_CATEGORIES` constant, not a local copy.

## Technical Notes

- Per the coding standards: Vitest + React Testing Library, mock Supabase at the boundary, no
  exhaustive snapshot testing. Focus on the logic that is risky, not on coverage percentage.
- If 005 chose a Postgres function, its behaviour needs pgTAP coverage alongside the component
  tests — the project already runs a pgTAP suite.

## Dependencies

### Requires

- 005-atomic-save
- 006-duplicate-name-handling

### Enables

- None

## Out of Scope

- Testing the items trigger — it is covered by intent 010's suite and is not this unit's code
