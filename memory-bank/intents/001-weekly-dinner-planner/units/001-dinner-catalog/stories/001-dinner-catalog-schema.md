---
id: 001-dinner-catalog-schema
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 001-dinner-catalog-schema

## User Story

**As a** developer building the app
**I want** a `dinners` and `dinner_ingredients` schema in Supabase with RLS enabled
**So that** the catalog can be queried, filtered, and later joined against weekly plans

## Acceptance Criteria

- [ ] **Given** the migration is applied, **When** I inspect the schema, **Then** a `dinners` table exists with columns for name, cuisine type, cook time (minutes), Rosie-approved flag, instructions, and an `is_active` flag (default true)
- [ ] **Given** the migration is applied, **When** I inspect the schema, **Then** a `dinner_ingredients` table exists with columns for dinner reference, ingredient name, quantity, unit, and grocery category
- [ ] **Given** RLS is enabled, **When** an unauthenticated request queries either table, **Then** it is denied
- [ ] **Given** RLS is enabled, **When** the authenticated household session queries either table, **Then** it succeeds

## Technical Notes

- `cook_time_minutes` should be an integer with a check constraint or app-level validation reflecting the ≤45 min seed requirement (schema itself doesn't need to hard-cap this, since future user-added recipes may vary).
- `grocery category` should be a constrained set (enum or check constraint), e.g. produce, dairy, meat/protein, pantry, frozen, other — needed for FR-3 grouping.
- Design so a `created_by`/editable flag could be added later without breaking changes (FR-6 future-proofing).
- `is_active` (boolean, default `true`) backs FR-7 suppress/un-suppress — default catalog queries filter `WHERE is_active = true`; a "Suppressed" view queries the inverse.

## Dependencies

### Requires
- None (foundational)

### Enables
- 002-seed-healthy-family-dinners
- 002-weekly-planning stories (reference `dinners`)
- All `003-weekly-dinner-planner-ui` stories

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Dinner with zero ingredients | Allowed at schema level, though not expected in seed data |
| Duplicate ingredient names within one dinner | Allowed (e.g. "salt" used twice at different steps) — aggregation logic handles merging downstream |

## Out of Scope

- Actual seed data population — see 002-seed-healthy-family-dinners
- Any UI or API beyond the schema/RLS itself
