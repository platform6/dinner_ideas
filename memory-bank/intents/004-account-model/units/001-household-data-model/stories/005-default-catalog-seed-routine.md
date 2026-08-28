---
id: 005-default-catalog-seed-routine
unit: 001-household-data-model
intent: 004-account-model
status: planned
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 029-household-data-model
---

# Story: 005-default-catalog-seed-routine

## User Story

**As a** new household
**I want** to start with the default dinner catalog and store layout
**So that** the app is useful immediately instead of showing an empty catalog

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then**
      `public.seed_default_household_catalog(p_household_id uuid)` exists, `security definer`,
      `search_path` pinned
- [ ] **Given** the function body, **Then** it inserts the default dinners + `dinner_ingredients` + `dinner_steps` currently defined in `20260826175606_seed_healthy_family_dinners.sql` and
      `20260826224346_dinner_catalog_steps.sql`, plus the default `grocery_store_rows` +
      `category_row_assignments` from `20260828000000_grocery_store_config_defaults.sql`, all
      stamped with `p_household_id`
- [ ] **Given** an empty household id, **When** the function is called, **Then** the household
      has exactly the same catalog + store config as a freshly-seeded DB has today (verified by
      a row-count + content diff test)
- [ ] **Given** a household that already has catalog rows, **When** the function is called
      again, **Then** it inserts nothing new (guarded by an existence check or
      `on conflict do nothing`) and does not error
- [ ] **Given** grants, **Then** `authenticated` **cannot** `execute` the function — only the
      `handle_new_user()` trigger and migrations call it
- [ ] **Given** the shipped seed migrations, **Then** they are **not edited**; the function is a
      new migration that re-expresses their data

## Technical Notes

- Keep the dinner data inline in the function (a big `insert ... select from (values ...)`), or
  stage it in a `create temp`/CTE — Construction decides in `ddd-02`. The parity test is the
  guardrail either way.
- The founding household (story `008`) already contains this data post-backfill, so the founding
  migration does **not** call this function — it only stamps existing rows. The function is for
  households created _after_ the model ships.
- `tags` are **not** seeded (today's DB seeds no tags; every dinner starts untagged — preserve
  that).

## Dependencies

### Requires

- `003-household-id-on-domain-tables` (needs `household_id` columns + reworked constraints)

### Enables

- `007-new-user-provisioning-trigger`

## Edge Cases

| Scenario                                | Expected Behavior                                                           |
| --------------------------------------- | --------------------------------------------------------------------------- |
| Called with a non-existent household id | FK violation on the first insert → whole call rolls back                    |
| Default catalog later changes           | Update this function in a new migration; existing households are unaffected |
| Partial failure mid-seed                | Runs in the caller's transaction — all-or-nothing                           |

## Out of Scope

- Per-household customization of the starter catalog
- Seeding tags or any weekly-plan/meal-history data
- The trigger that calls this (story `007`)
