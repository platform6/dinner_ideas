---
id: 005-atomic-save
unit: 001-recipe-manual-entry
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 060-recipe-save
implemented: false
---

# Story: 005-atomic-save

## User Story

**As a** household member who just filled in a recipe
**I want** saving to either work completely or not at all
**So that** I never end up with a dinner in the catalog that has no ingredients or no steps

## Acceptance Criteria

- [ ] **Given** a valid draft, **When** saved, **Then** one `dinners` row, one
      `dinner_ingredients` row per line, one `dinner_steps` row per step and one `dinner_tags`
      row per attached tag are written.
- [ ] **Given** a hand-typed tag not yet in the vocabulary, **When** saved, **Then** it is
      created in `tags` (lowercase, via `normalizeTagName`); an existing one is reused, never
      duplicated.
- [ ] **Given** this intent, **When** its migration lands, **Then** `dinners.name` uniqueness is
      scoped to the household, replacing the inherited global constraint.
- [ ] **Given** a save that fails partway, **When** it returns, **Then** no partial dinner exists:
      either all three tables carry the recipe, or none of them do.
- [ ] **Given** the save, **When** it writes, **Then** `household_id` comes from the caller's
      household and the existing RLS insert policies are used unchanged — no new policy, no
      `service_role` path.
- [ ] **Given** a saved dinner, **When** the catalog is viewed, **Then** it appears and can be
      picked for a week.
- [ ] **Given** a saved dinner, **When** the cooking view is opened for it, **Then** its numbered
      steps render exactly as a founding dinner's do — never the empty state.
- [ ] **Given** an ingredient name not seen before, **When** the save completes, **Then** it
      appears as an unreviewed grocery on `/store`, written by the existing trigger and by no
      application code.

## Technical Notes

**This story owns the intent's one real design decision, and must record it as an ADR.**

It also carries a certain migration regardless of that decision: `dinners.name` becomes unique
per household (resolved decision 3). No client-side approach avoids that, so this bolt ships a
migration either way — pick the atomicity mechanism on its merits, not on whether it "adds"
a migration that is already there.

PostgREST inserts are separate HTTP calls; there is no transaction from the browser. Two options:

1. **A Postgres function** taking the whole recipe, doing three inserts in one transaction.
   Correct by construction. Costs one additive migration. ADR-1's principle — anything that must
   hold regardless of caller belongs in Postgres — points here.
2. **Client-side compensation**: insert the dinner, then children, and delete the dinner on
   failure. Both children are `on delete cascade`, so one delete cleans up. No migration, but the
   compensating delete can itself fail — producing precisely the orphan this story forbids.

Weigh them and write the ADR. Note that option 1 makes this a `ddd-construction-bolt` with a
migration; option 2 keeps it simple. Do not pick for convenience of bolt type.

## Dependencies

### Requires

- 002-dinner-fields-form
- 003-ingredient-lines-editor
- 004-cooking-steps-editor

### Enables

- 006-duplicate-name-handling

## Edge Cases

| Scenario                                         | Expected Behavior                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Connection drops after the dinner row is written | No orphan survives — that is the whole point of the story                                 |
| A category value somehow outside the CHECK set   | Rejected by the database; surfaced as a clear message                                     |
| Save pressed twice quickly                       | One dinner, not two — the unique name constraint helps, but the UI should also prevent it |

## Out of Scope

- Updating an existing dinner (FR-9)
- Any change to the items trigger or to placement tables
