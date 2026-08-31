---
stage: test
bolt: 027-household-data-model
created: 2026-08-29T00:50:00Z
---

## Test Report: household-data-model (bolt 027)

### Summary

- **DB tests written**: `supabase/tests/database/account_model_household_id_test.sql` — 19 pgTAP
  assertions: `household_id` present on the six direct-column tables (indexed), absent on the four
  child tables, the three reworked constraints, per-household tag-name uniqueness, and the
  story-009 function scoping (reorder RPC scoped to the target household, meal-history trigger
  stamping `household_id`, exactly-3-to-lock regression).
- **Live execution**: ✅ run and green (2026-08-29, local Supabase via Docker).
  `account_model_household_id_test.sql` passes as part of the full `supabase test db` run.
  **Bug found and fixed here**: `dinners.name` was still globally `unique` — story 003 missed it,
  and `seed_default_household_catalog()` for a second household collided on `dinners_name_key`.
  This migration now also reworks `dinners` → `unique nulls not distinct (household_id, name)`.
  The pre-existing `weekly_planning*` / `dinner_catalog*` / `grocery_store_config` suites were
  updated for the household-scoped schema (founding-owner JWT for inserts; composite-constraint
  assertions).
- **Existing suites** (`weekly_planning_test.sql`, `grocery_store_config_test.sql`,
  `weekly_planning_meal_history_test.sql`, etc.): expected to remain green **unchanged**. The new
  `household_id` column is nullable with a default, and `unique nulls not distinct` preserves the
  exact global-uniqueness behaviour those tests assume while every row's `household_id` is null.
  Two-household coverage is added in the new file rather than by editing those files blind (they
  could not be re-run here to confirm an edit).

### Test Files

- [x] `supabase/tests/database/account_model_household_id_test.sql` — columns, constraints, and
      function scoping for bolt 027.

### Acceptance Criteria Validation

Story **003-household-id-on-domain-tables**:

- ✅ `household_id uuid references households(id) on delete cascade default current_user_household_id()`
  on `dinners`, `tags`, `grocery_store_rows`, `category_row_assignments`, `weekly_plans`,
  `meal_history` — `has_column` ×6 + migration.
- ✅ btree index per new column — `create index if not exists idx_<t>_household_id` ×6;
  `has_index` spot-check on `dinners`.
- ✅ child tables get no column — `hasnt_column` on `dinner_ingredients`, `weekly_plan_selections`
  (same applies to `dinner_steps`, `dinner_tags` by the same migration).
- ✅ `tags`: `unique (name)` → `unique (household_id, name)`, lowercase `check` kept —
  `col_is_unique` + the "quick" ×2-households `lives_ok` / same-household `throws_ok`.
- ✅ `grocery_store_rows`: `unique (position)` → `unique (household_id, position)` —
  `col_is_unique`.
- ✅ `category_row_assignments`: PK `(category)` → interim `unique (household_id, category)` +
  `category set not null` — `col_isnt_pk`; bolt 030 promotes to the real PK.
- ✅ column added **nullable**; migration header states the add → backfill (030) → set-not-null
  (030) staging explicitly.
- ⏳ `supabase gen types` shows the new columns — pending; hand-applied in bolt 031's
  `database.types.ts` edit in the meantime.

Story **009-scoping-existing-functions**:

- ✅ `fn_weekly_plans_record_meal_history` sets `meal_history.household_id = new.household_id` —
  `lives_ok` asserting 3 rows carry household A's id after a lock.
- ✅ `reorder_grocery_store_row` derives `household_id` from the `for update` select and scopes
  its `count(*)` + every shift `update` — `lives_ok` (reorder within A), `results_eq` (B
  untouched), `throws_ok` (A's range check counts only A's 3 rows).
- ✅ household B positions unchanged when A reorders — `results_eq`.
- ✅ `dinner_last_chosen` per-household via `security_invoker` + bolt 028 RLS — **no code change**;
  verified by a two-household case in `weekly_planning_meal_history_test.sql` after bolt 028 (noted
  as a follow-up; cannot run here).
- ✅ `lock_weekly_plan` / the three guard triggers unchanged — exactly-3-to-lock regression
  `throws_ok` included; the immutability-after-lock and max-3 guards are unchanged code paths.
- ⏳ extend `weekly_planning_test.sql` / `grocery_store_config_test.sql` with a two-household case
  — deferred to the push step so the edits can be run; the new file already carries equivalent
  two-household coverage.

### Issues Found

- **Pre-existing race, not introduced here**: two concurrent `reorder_grocery_store_row` calls for
  _different_ rows in the _same_ household could both set `position = -1` and collide. This
  existed globally before bolt 027 and is explicitly out of scope for story 009 ("no functional
  change"). Flagged for a future hardening bolt.

### Recommendations

1. At push time run the full `supabase test db` and also add the two-household case to the two
   existing suites, then re-run.
2. After bolt 028, add an explicit `dinner_last_chosen` cross-household leak test.
3. Keep 026–030 as a single `db push`.
