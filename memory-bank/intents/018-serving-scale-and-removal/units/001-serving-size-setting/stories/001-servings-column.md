---
id: 001-servings-column
unit: 001-serving-size-setting
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T16:24:16Z'
assigned_bolt: null
implemented: false
---

# Story: 001-servings-column

## User Story

**As a** household
**I want** my serving size stored with my other settings
**So that** the app can stop assuming a number that was only ever true for one family

## Acceptance Criteria

- [ ] **Given** the migration, **When** applied, **Then** `households.servings_per_dinner` exists,
      defaults to **3**, and is constrained to a sensible range (1-12 suggested, to be settled in design)
- [ ] **Given** an existing household, **When** the migration runs, **Then** its behaviour is
      unchanged — the default is the number the app already used
- [ ] **Given** the column, **When** written, **Then** existing household RLS applies unchanged; no
      new policy and no `service_role` path

## Technical Notes

- `20260908190000_dinners_per_week.sql` is the closest precedent, minus its trigger rewrite
- ADR-12 applies to any function this touches: restate `set search_path = ''` when replacing one
