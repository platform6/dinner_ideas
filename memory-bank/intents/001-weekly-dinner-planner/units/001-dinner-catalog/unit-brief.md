---
unit: 001-dinner-catalog
intent: 001-weekly-dinner-planner
phase: inception
status: complete
created: '2026-08-26T17:26:14Z'
updated: '2026-08-27T01:00:00Z'
---

# Unit Brief: Dinner Catalog

## Purpose

Owns the dinner/recipe domain: the schema for dinners and their ingredients, a generic tag system, access control, and the seed dataset the app launches with.

## Scope

### In Scope

- `dinners` schema: name, cuisine type, cook time, instructions, `is_active` flag (suppress/un-suppress)
- `dinner_ingredients` schema: per-dinner ingredient name, quantity, unit, grocery category — pre-scaled to 3 servings
- RLS policies for the shared household session
- Seed data migration (≥50 dinners meeting FR-5 criteria)
- `dinner_steps` schema: ordered, discrete cooking steps per dinner (FR-8), plus step content for all 50 seed dinners
- Generic tags schema (FR-9): `tags` + `dinner_tags` join table, replacing the old `rosie_approved` boolean; tag names normalized to lowercase on write

### Out of Scope

- Weekly selection / plan state → `002-weekly-planning`
- Any UI (incl. the "+" add-tag control and tag filter) → `003-weekly-dinner-planner-ui`
- Add/edit-recipe UI (future work — FR-6) — but schema must not block it later

---

## Assigned Requirements

| FR   | Requirement                                               | Priority            |
| ---- | --------------------------------------------------------- | ------------------- |
| FR-1 | Browsable/filterable catalog (schema/tags side)           | Must                |
| FR-5 | Seed data — healthy family dinners                        | Must                |
| FR-6 | Recipe management (future) — schema must accommodate      | Won't (this intent) |
| FR-7 | Suppress a dinner (`is_active` flag, schema side)         | Must                |
| FR-8 | Cooking view (`dinner_steps` schema + content, data side) | Must                |
| FR-9 | Generic tag system (schema side)                          | Must                |

---

## Domain Concepts

### Key Entities

| Entity           | Description                                                                      | Attributes                                                     |
| ---------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Dinner           | A single recipe/meal option                                                      | name, cuisine_type, cook_time_minutes, instructions, is_active |
| DinnerIngredient | One ingredient line within a dinner, pre-scaled to 3 servings                    | dinner_id, name, quantity, unit, category                      |
| DinnerStep       | One ordered cooking step within a dinner                                         | dinner_id, step_number, instruction                            |
| Tag              | A shared, lowercase-normalized label (e.g. `kid-friendly`) usable across dinners | name (unique, lowercase)                                       |
| DinnerTag        | One dinner ↔ tag association                                                     | dinner_id, tag_id                                              |

### Key Operations

| Operation               | Description                                                                                 | Inputs               | Outputs                   |
| ----------------------- | ------------------------------------------------------------------------------------------- | -------------------- | ------------------------- |
| List dinners (filtered) | Return dinners matching cuisine/cook-time/Rosie-approved filters, active by default         | filter params        | Dinner[] with ingredients |
| Get dinner ingredients  | Return ingredient list for a given dinner                                                   | dinner_id            | DinnerIngredient[]        |
| Set dinner active flag  | Suppress or un-suppress a dinner                                                            | dinner_id, is_active | Updated Dinner            |
| Get dinner steps        | Return ordered cooking steps for a given dinner                                             | dinner_id            | DinnerStep[] (ordered)    |
| Add tag to dinner       | Attach a tag to a dinner, creating the tag if it doesn't already exist (lowercase, deduped) | dinner_id, tag name  | DinnerTag                 |
| Remove tag from dinner  | Detach a tag from a dinner                                                                  | dinner_id, tag_id    | (none)                    |
| List dinners by tag     | Return dinners matching one or more tags                                                    | tag name(s)          | Dinner[]                  |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 4     |
| Must Have     | 4     |
| Should Have   | 0     |
| Could Have    | 0     |

### Stories

| Story ID                             | Title                            | Priority | Status   |
| ------------------------------------ | -------------------------------- | -------- | -------- |
| 001-dinner-catalog-schema            | Dinner catalog schema            | Must     | Complete |
| 002-seed-healthy-family-dinners      | Seed healthy family dinners      | Must     | Complete |
| 003-dinner-step-by-step-instructions | Dinner step-by-step instructions | Must     | Complete |
| 004-generic-tags-schema              | Generic tags schema              | Must     | Planned  |

---

## Dependencies

### Depends On

| Unit | Reason            |
| ---- | ----------------- |
| None | Foundational unit |

### Depended By

| Unit                         | Reason                                                |
| ---------------------------- | ----------------------------------------------------- |
| 002-weekly-planning          | References `dinners` for weekly selections            |
| 003-weekly-dinner-planner-ui | Reads dinners/ingredients for catalog + shopping list |

### External Dependencies

| System              | Purpose                        | Risk |
| ------------------- | ------------------------------ | ---- |
| Supabase (Postgres) | Schema, RLS, seed data storage | Low  |

---

## Technical Context

### Suggested Technology

Supabase migration (SQL), per `standards/data-stack.md` and `standards/tech-stack.md`.

### Integration Points

| Integration                  | Type | Protocol                    |
| ---------------------------- | ---- | --------------------------- |
| 003-weekly-dinner-planner-ui | DB   | Supabase client (PostgREST) |

### Data Storage

| Data                  | Type           | Volume                                      | Retention  |
| --------------------- | -------------- | ------------------------------------------- | ---------- |
| Dinners + ingredients | Postgres (SQL) | ~20-40 rows dinners, ~5-10 ingredients each | Indefinite |

---

## Constraints

- Ingredient quantities must be authored pre-scaled to 3 servings (per intent constraint).
- Schema should support a future `created_by`/editable-recipe flow without a breaking migration (e.g. avoid assumptions that all dinners are immutable seed-only rows).

---

## Success Criteria

### Functional

- [ ] Dinners can be queried filtered by cuisine, cook time, Rosie-approved
- [ ] Each dinner's ingredients are queryable with category grouping intact
- [ ] Seed migration inserts ≥50 dinners meeting FR-5 criteria (content drafted in `seed-data-draft.md`)
- [ ] A dinner's `is_active` flag can be toggled, and default queries exclude inactive dinners
- [ ] Every seed dinner has ordered, discrete cooking steps queryable via `dinner_steps` (FR-8)

### Non-Functional

- [ ] RLS restricts read/write to authenticated household session only

### Quality

- [ ] All acceptance criteria met
- [ ] Migration is idempotent / re-runnable in dev

---

## Bolt Suggestions

| Bolt               | Type | Stories                                                    | Objective                                                               |
| ------------------ | ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| 001-dinner-catalog | DDD  | 001-dinner-catalog-schema, 002-seed-healthy-family-dinners | Core `dinners`/`dinner_ingredients` schema + RLS + seed data (complete) |
| 007-dinner-catalog | DDD  | 003-dinner-step-by-step-instructions                       | `dinner_steps` schema + step content for all 50 seed dinners (FR-8)     |
| 009-dinner-catalog | DDD  | 004-generic-tags-schema                                    | `tags`/`dinner_tags` schema replacing `rosie_approved` (FR-9)           |

---

## Notes

Seed content (the actual 20 dinner recipes) will be curated during/after story creation — see intent-level notes for candidate list.

**Revised 2026-08-26 during Construction (bolt 003-weekly-dinner-planner-ui, Stage 1 replan)**: added FR-8 (Cooking View), which requires this unit to store step-by-step instructions structurally (`dinner_steps`) rather than the single-sentence `instructions` blob seeded in bolt `001-dinner-catalog`. This unit was already marked complete; scope reopened via a new follow-up bolt (`007-dinner-catalog`) rather than amending the already-applied migration. See `inception-log.md` Scope Changes.

**Revised 2026-08-27 post-deployment**: added FR-9 (Generic Tag System), replacing `rosie_approved` with a real tags schema. Scope reopened via a new follow-up bolt (`009-dinner-catalog`). No auto-migration of old `rosie_approved = true` rows into a tag — dinners start untagged. See `inception-log.md` Scope Changes.
