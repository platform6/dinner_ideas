---
id: 028-household-data-model
unit: 001-household-data-model
intent: 004-account-model
type: ddd-construction-bolt
status: complete
started: '2026-08-29T01:00:00Z'
current_stage: null
stages_completed:
  - name: domain-model
    completed: '2026-08-29T01:04:00Z'
    artifact: ddd-01-domain-model.md
  - name: technical-design
    completed: '2026-08-29T01:14:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-08-29T01:18:00Z'
    artifact: none — pure application of ADR-1 (RLS is the enforcement boundary)
  - name: implement
    completed: '2026-08-29T01:35:00Z'
    artifact: supabase/migrations/20260828232000_account_model_household_scoped_rls.sql
  - name: test
    completed: '2026-08-29T01:45:00Z'
    artifact: ddd-03-test-report.md
stories:
  - 004-household-scoped-rls
created: '2026-08-28T00:00:00Z'
requires_bolts:
  - 027-household-data-model
enables_bolts:
  - 029-household-data-model
  - 030-household-data-model
  - 031-account-model-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
completed: '2026-08-28T23:37:23Z'
---

# Bolt: 028-household-data-model

## Objective

Replace all 35 `using (true)` policies across the 10 domain tables with household-scoped policies
— direct `household_id = current_user_household_id()` for parent tables, `exists(... parent ...)`
for child tables — and prove isolation with a per-table select/insert/update/delete test matrix.
Isolated in its own bolt because it is the highest-risk change and the test surface is large.

## Stories Included

- [ ] **004-household-scoped-rls**: drop + recreate every domain policy as household-scoped;
      keep `meal_history` insert-only; assert `pg_policies … qual='true'` count is 0 —
      Priority: Must

## Expected Outputs

- New migration dropping and recreating policies on `dinners`, `dinner_ingredients`,
  `dinner_steps`, `tags`, `dinner_tags`, `weekly_plans`, `weekly_plan_selections`,
  `meal_history`, `grocery_store_rows`, `category_row_assignments`
- `supabase/tests/database/`: one isolation case per table (A vs B, all four verbs), a
  `with check` rejection case, and the `pg_policies` guard assertion
- DDD artifacts (`ddd-01`/`02`/`03`)

## Dependencies

### Bolt Dependencies (within intent)

- **027-household-data-model** (Required): needs `household_id` on parents + children's parent columns

### Unit Dependencies (cross-unit)

- `001-weekly-dinner-planner` — owns the policies being replaced

### Enables

- `029-household-data-model` (seeded households must be provably isolated)
- `030-household-data-model` (post-migration login is tested under real RLS)
- `031-account-model-ui` (frontend reads rely on RLS scoping)

## Success Criteria

- [ ] No `using (true)` policy remains on any domain table
- [ ] Per-table: a member of household B gets 0 rows / permission error for household A on
      select, insert, update, delete
- [ ] Inserting a row with another household's `household_id` is rejected by `with check`
- [ ] `meal_history` still has no update/delete policy
- [ ] Existing DB tests updated to run within a household context and pass
- [ ] DDD stages complete; code reviewed

## Notes

Child-table policies gate through the parent's `household_id` column (from bolt `027`), not a
join to `households`. Grants are untouched — only predicates change. Expect the bulk of the
effort to be the test matrix, not the DDL.
