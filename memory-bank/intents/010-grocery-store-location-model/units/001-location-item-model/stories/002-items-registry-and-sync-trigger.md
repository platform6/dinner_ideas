---
id: 002-items-registry-and-sync-trigger
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 050-location-item-model
implemented: false
---

# Story: 002-items-registry-and-sync-trigger

## User Story

**As a** developer wiring the walking-path model into the existing catalog
**I want** a deduped, household-scoped Items registry that stays in sync automatically
**So that** every ingredient — from today's manual entry or a future import feature — gets a
stable identity with no application code needing to remember to create one

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** `items(id, household_id, name,
    name_key generated always as (lower(trim(name))) stored, created_at)` exists with
      `unique (household_id, name_key)`.
- [ ] **Given** a trigger on `dinner_ingredients` (`after insert or update of name`), **When**
      a row is written, **Then** it resolves `household_id` via `dinner_id → dinners
    .household_id` and runs `insert into items (household_id, name) values (...) on
    conflict (household_id, name_key) do nothing`.
- [ ] **Given** two `dinner_ingredients` rows with names that differ only in case/whitespace
      (e.g. "Black Beans" and " black beans "), **When** both trigger, **Then** exactly one
      `items` row exists for that household.
- [ ] **Given** the trigger, **When** it fires from **any** insertion path (today's manual
      dinner-creation flow; hypothetically a future import feature, untested here), **Then**
      the same get-or-create runs — no application code is required to call anything for an
      Item to exist.
- [ ] **Given** RLS, **When** applied to `items`, **Then** it mirrors `20260828232000`'s shape.

## Technical Notes

- `name_key` as a generated column (not an expression index) makes the dedup key
  discoverable via `\d items` and usable directly in the `on conflict` target.
- The trigger function is `security definer` if it needs to read `dinners.household_id`
  across RLS, matching the pattern of other cross-table trigger functions in this codebase
  (e.g. `fn_weekly_plans_record_meal_history`).
- No backfill here — that is story 007 (cutover), which reuses this same table/constraint.

## Dependencies

### Requires

- 001-stores-and-locations-schema (schema conventions, not a hard FK dependency)

### Enables

- 003-item-and-category-placements
- 004-location-resolution-query
- 007-cutover-migration (the backfill target)

## Edge Cases

| Scenario                                                                    | Expected Behavior                                                                                                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An ingredient name changes on an existing `dinner_ingredients` row          | The `update of name` trigger fires; a new Item is get-or-created for the new name (the old Item row, if now unreferenced, is left in place — pruning is out of scope) |
| A future import writes a messier name ("black beans, drained")              | Creates a distinct Item — not a data-integrity issue; the similarity suggestion (unit 2, FR-7) offers a one-tap fix at placement time                                 |
| Concurrent inserts of the same new ingredient name from two dinners at once | `on conflict do nothing` makes this race-safe — exactly one `items` row results                                                                                       |

## Out of Scope

- Backfilling existing `dinner_ingredients` into `items` (story 007)
- The fuzzy similarity match used for placement suggestions (unit 2, FR-7) — this story's
  dedup is exact, case-insensitive match only
