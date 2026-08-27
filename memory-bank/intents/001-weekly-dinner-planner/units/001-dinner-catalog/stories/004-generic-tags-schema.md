---
id: 004-generic-tags-schema
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-27T01:00:00Z'
assigned_bolt: 009-dinner-catalog
implemented: true
---

# Story: 004-generic-tags-schema

## User Story

**As a** wife curating the catalog
**I want** to attach any tags I choose to a dinner, instead of just a fixed "Rosie-approved" flag
**So that** I can organize/filter dinners by whatever labels actually matter to me over time

## Acceptance Criteria

- [ ] **Given** the migration has run, **When** I check the `dinners` table, **Then** `rosie_approved` no longer exists
- [ ] **Given** a new tags schema, **When** I add the tag "Kid-Friendly" to a dinner, **Then** it is stored as `kid-friendly` (lowercase)
- [ ] **Given** a dinner already tagged `kid-friendly`, **When** another dinner is tagged "KID-FRIENDLY", **Then** both reference the same tag row, not two separate ones
- [ ] **Given** the migration has run, **When** I query any pre-existing (seeded) dinner, **Then** it has zero tags — no automatic carryover from the old `rosie_approved` values
- [ ] **Given** a dinner with tags, **When** a tag is removed from it, **Then** the dinner ↔ tag association is deleted (the tag row itself persists if other dinners still use it)

## Technical Notes

- Additive migration (new file), does not modify `20260826175605_dinner_catalog_schema.sql` — same pattern as `20260826224346_dinner_catalog_steps.sql`.
- Suggested shape: `tags` (id, name unique) + `dinner_tags` (dinner_id, tag_id, unique pair) join table. Normalize to lowercase at the DB layer (e.g. a check constraint or a trigger lowering input) so it can't be bypassed by a direct insert.
- Drop `dinner_ingredients`... no — only drop `dinners.rosie_approved` and any index on it; `dinner_ingredients`/`dinner_steps` are untouched.
- RLS policies mirror the existing pattern in `dinner_steps` (household-session gate on auth only).

## Dependencies

### Requires

- 001-dinner-catalog-schema

### Enables

- `012-tag-management-ui` (unit 003) — UI to add/remove tags and filter by them

## Edge Cases

| Scenario                                                    | Expected Behavior                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Adding a tag that's just whitespace or empty after trimming | Rejected — no empty tag names                                                     |
| Removing the last dinner referencing a tag                  | Tag row itself is left in place (reusable later), only the association is removed |

## Out of Scope

- The "+" add-tag control and tag filter UI (→ `012-tag-management-ui`)
- Any migration of old `rosie_approved` data into a tag (explicitly not done)
