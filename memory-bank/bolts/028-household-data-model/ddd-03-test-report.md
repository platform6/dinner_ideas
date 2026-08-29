---
stage: test
bolt: 028-household-data-model
created: 2026-08-29T01:45:00Z
---

## Test Report: household-data-model (bolt 028 — RLS rewrite)

### Summary

- **DB tests written**: `supabase/tests/database/account_model_rls_isolation_test.sql` — 22 pgTAP
  assertions forming the isolation matrix: the `pg_policies` `using (true)` self-check (= 0),
  `meal_history` has no update/delete policy, per-table SELECT isolation (10 tables — direct rows
  and child rows both checked), INSERT `with check` rejection of a forged `household_id` (direct +
  child), UPDATE/DELETE against household A affecting 0 rows, and a positive control (B can still
  read and insert its own data, and a new row self-assigns to B).
- **Live execution**: ✅ run and green (2026-08-29, local Supabase via Docker).
  `account_model_rls_isolation_test.sql` passes 22/22 as part of the full `supabase test db` run.
  Two test-only fixes during verification: fixtures set `app.provisioning_disabled` so the
  `handle_new_user()` trigger doesn't seed catalogs for the two synthetic members; the three
  "UPDATE/DELETE affects 0 rows" checks were rewritten as `DO` blocks reading `ROW_COUNT`
  (a data-modifying CTE can't sit in a subquery). No migration change.
- **Static review**: all 35 original policies are dropped by exact name (cross-checked against
  migrations `20260826175605` / `20260826192038` / `20260826224346` / `20260827020000` /
  `20260827030000` / `20260827040000`) and 35 replacements created — 27 direct-table policies + 8
  child-table policies. `meal_history` recreated with select+insert only.

### Test Files

- [x] `supabase/tests/database/account_model_rls_isolation_test.sql` — full isolation matrix.

### Acceptance Criteria Validation (story 004-household-scoped-rls)

- ✅ every `using (true)` / `with check (true)` policy on the 10 tables dropped and replaced —
  migration drops each by name; `pg_policies` count assertion proves none remain.
- ✅ direct tables use `household_id = current_user_household_id()` on select/insert/update/delete
  (with matching `with check` on writes) — `dinners`, `tags`, `weekly_plans`, `meal_history`,
  `grocery_store_rows`, `category_row_assignments`.
- ✅ child tables use `exists (select 1 from <parent> p where p.id = <fk> and p.household_id = current_user_household_id())`
  — `dinner_ingredients`/`dinner_steps`/`dinner_tags` → `dinners`, `weekly_plan_selections` →
  `weekly_plans`.
- ✅ `meal_history` insert-only shape preserved — no update/delete policy (asserted).
- ✅ `pg_policies … qual = 'true'` (and `with_check = 'true'`) count is 0 for all domain tables.
- ✅ member-of-B session: SELECT returns 0 of A's rows, INSERT/UPDATE/DELETE against A's data is a
  policy violation or 0-row no-op — one assertion per table (SELECT), plus representative
  INSERT/UPDATE/DELETE cases.
- ✅ member of B inserting `household_id = A` → `with check` rejects (`42501`) — asserted for a
  direct table and a child table.
- ✅ grants unchanged — every recreated policy is `to authenticated`; migration touches no `grant`.

### Issues Found

- **Deploy-order dependency (documented, not a bug)**: strictly between this migration and bolt
  030's backfill, all domain rows have `household_id = null` and the founding user has no
  membership, so everything is invisible and the meal-history trigger's `with check` would fail.
  Harmless during a single `supabase db push` (no traffic between migrations); dangerous if 028 is
  pushed without 030. The migration header and both design docs call this out.
- `dinner_last_chosen` (`security_invoker`) inherits the new policies automatically; its
  cross-household test lives with story 009 (bolt 027) and should be run after this migration.

### Recommendations

1. Push 026 → 030 as one unit; run `supabase test db` immediately after.
2. Add `explain (verbose)` spot-checks on `dinners` and `dinner_ingredients` to confirm
   `current_user_household_id()` appears as a one-time filter (InitPlan), not a per-row SubPlan.
3. Manually verify the live app (founding login) after bolt 030: catalog, plan, cooking, shopping
   list, store config all behave exactly as before.
