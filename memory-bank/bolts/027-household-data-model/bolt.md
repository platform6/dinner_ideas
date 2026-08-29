---
id: 027-household-data-model
unit: 001-household-data-model
intent: 004-account-model
type: ddd-construction-bolt
status: complete
started: '2026-08-29T00:00:00Z'
current_stage: null
stages_completed:
  - name: domain-model
    completed: '2026-08-29T00:05:00Z'
    artifact: ddd-01-domain-model.md
  - name: technical-design
    completed: '2026-08-29T00:18:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-08-29T00:22:00Z'
    artifact: none — extends ADR-1; add-nullable/backfill/set-not-null staging documented in ddd-02
  - name: implement
    completed: '2026-08-29T00:40:00Z'
    artifact: supabase/migrations/20260828231000_account_model_household_id_columns.sql
  - name: test
    completed: '2026-08-29T00:50:00Z'
    artifact: ddd-03-test-report.md
stories:
  - 003-household-id-on-domain-tables
  - 009-scoping-existing-functions
created: '2026-08-28T00:00:00Z'
requires_bolts:
  - 026-household-data-model
enables_bolts:
  - 028-household-data-model
  - 030-household-data-model
  - 031-account-model-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
completed: '2026-08-28T23:33:44Z'
---

# Bolt: 027-household-data-model

## Objective

Give every domain table a `household_id` (direct or via parent), rework the unique/PK constraints
that a single global namespace assumed, index the new columns, and update the three DB objects
that read those columns or assume one global table (`fn_weekly_plans_record_meal_history`,
`reorder_grocery_store_row`, `dinner_last_chosen`) — plus regression coverage for the weekly-plan
guard triggers.

## Stories Included

- [ ] **003-household-id-on-domain-tables**: `household_id` on `dinners` / `tags` /
      `grocery_store_rows` / `category_row_assignments` / `weekly_plans` / `meal_history`
      (nullable + `default current_user_household_id()`); child tables via parent; `tags` →
      `unique (household_id, name)`, `grocery_store_rows` → `unique (household_id, position)`,
      `category_row_assignments` PK → `(household_id, category)`; one index per column —
      Priority: Must
- [ ] **009-scoping-existing-functions**: `meal_history.household_id` set by the lock trigger;
      `reorder_grocery_store_row` scopes its `count(*)` + shifts by household; `dinner_last_chosen`
      confirmed/adjusted per household; guard triggers + `lock_weekly_plan` regression-tested —
      Priority: Must

## Expected Outputs

- New migration(s): `alter table` column adds + constraint reworks + indexes; `create or
replace` for the meal-history trigger fn, the reorder RPC, and (if needed) the view
- `supabase/tests/database/`: two-household reorder test, meal-history `household_id` test,
  `dinner_last_chosen` per-household test, guard-trigger regression cases; extend
  `weekly_planning_test.sql` and `grocery_store_config_test.sql`
- DDD artifacts (`ddd-01`/`02`/`03`)

## Dependencies

### Bolt Dependencies (within intent)

- **026-household-data-model** (Required): needs `households` + `current_user_household_id()`

### Unit Dependencies (cross-unit)

- `001-weekly-dinner-planner` — owns the functions/view being modified

### Enables

- `028-household-data-model` (RLS rewrite needs the columns)
- `030-household-data-model` (founding migration backfills these columns then sets `not null`)
- `031-account-model-ui` (types regen needs the columns)

## Success Criteria

- [ ] Every direct-column table has a nullable `household_id` with the FK, default, and an index
- [ ] Reworked constraints in place; positions still contiguous per household
- [ ] `meal_history` rows on lock carry the parent plan's `household_id`
- [ ] Reordering rows in household A never renumbers household B
- [ ] `dinner_last_chosen` returns only the caller's household's dinners
- [ ] Guard triggers + `lock_weekly_plan` proven unchanged in behaviour
- [ ] DDD stages complete; code reviewed

## Notes

Columns are **nullable** here on purpose — there is no founding household to point them at until
bolt `030`. The `ddd-02-technical-design.md` must spell out the add-nullable → (bolt 030)
backfill → `set not null` staging so a reviewer can see the whole sequence.
