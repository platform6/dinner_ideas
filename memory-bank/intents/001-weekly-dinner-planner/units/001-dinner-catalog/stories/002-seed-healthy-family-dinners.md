---
id: 002-seed-healthy-family-dinners
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 002-seed-healthy-family-dinners

## User Story

**As a** wife using the app for the first time
**I want** the catalog to already contain a solid set of healthy, family-friendly dinners
**So that** I can start picking my week immediately, without an empty app

## Acceptance Criteria

- [ ] **Given** the seed migration has run, **When** I query all dinners, **Then** at least 50 dinners exist
- [ ] **Given** any seed dinner, **When** I check its cook time, **Then** it is ≤ 45 minutes
- [ ] **Given** any seed dinner, **When** I check its fields, **Then** it has a cuisine type and a non-empty ingredient list with quantities scaled for 3 servings and each ingredient assigned a grocery category
- [ ] **Given** the full seed set, **When** I count Rosie-approved dinners, **Then** roughly half are marked Rosie-approved
- [ ] **Given** the full seed set, **When** I review it for healthiness, **Then** dinners favor lean proteins, vegetables, and whole grains over fried/processed/heavy-cream-based dishes

## Technical Notes

- Recipe content (names, cuisines, ingredients+quantities+categories, Rosie-approved calls) has been drafted in `seed-data-draft.md` — this story is about turning that draft into an actual seed migration/script.
- Reasonable spread across cuisines (not all one style) supports FR-1 filtering being meaningfully useful.

## Dependencies

### Requires
- 001-dinner-catalog-schema

### Enables
- Meaningful use of `003-weekly-dinner-planner-ui` catalog/filter/selection stories in development and demos

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Re-running the seed migration | Should not duplicate rows (idempotent seed, e.g. upsert on a unique dinner name) |

## Out of Scope

- User-submitted recipes (FR-6, future)
