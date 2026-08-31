---
stage: design
bolt: 028-household-data-model
created: 2026-08-29T01:14:00Z
---

## Technical Design: household-data-model (bolt 028 — RLS rewrite)

### Architecture Pattern

Unchanged. One migration:
`supabase/migrations/20260828232000_account_model_household_scoped_rls.sql`. It `drop policy if
exists` on all 35 domain policies and `create policy` replacements. No table, column, function,
grant, or index touched.

### Migration structure

Per table, in this order (`dinners` first so child predicates reference a table whose own policies
already exist — ordering is cosmetic since policies are independent, but it keeps the file
readable):

1. `dinners` — 4 policies
2. `dinner_ingredients` — 4 (child → `dinners`)
3. `dinner_steps` — 4 (child → `dinners`)
4. `tags` — 4
5. `dinner_tags` — 3 (select/insert/delete; child → `dinners`)
6. `weekly_plans` — 3 (select/insert/update)
7. `weekly_plan_selections` — 3 (select/insert/delete; child → `weekly_plans`)
8. `meal_history` — 2 (select/insert only — **immutability preserved**)
9. `grocery_store_rows` — 4
10. `category_row_assignments` — 4

Total dropped: 35. Total created: 35.

### Predicate templates

**Direct-column table** `<t>` ∈ {`dinners`, `tags`, `weekly_plans`, `meal_history`,
`grocery_store_rows`, `category_row_assignments`}:

```sql
create policy "<t> select in own household" on public.<t>
  for select to authenticated
  using (household_id = public.current_user_household_id());

create policy "<t> insert in own household" on public.<t>
  for insert to authenticated
  with check (household_id = public.current_user_household_id());

create policy "<t> update in own household" on public.<t>
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());

create policy "<t> delete in own household" on public.<t>
  for delete to authenticated
  using (household_id = public.current_user_household_id());
```

- `meal_history`: create **only** the `select` and `insert` policies. No `update` / `delete`.
- `weekly_plans`: create `select`, `insert`, `update` (no `delete` — matches today; plans are
  never deleted, only locked).

**Child table** `<c>` with parent `<p>` on FK `<fk>`:

```sql
create policy "<c> select via parent household" on public.<c>
  for select to authenticated
  using (exists (
    select 1 from public.<p> p
    where p.id = public.<c>.<fk>
      and p.household_id = public.current_user_household_id()
  ));
-- insert: same predicate in with check
-- update (dinner_ingredients / dinner_steps only): predicate in both using and with check
-- delete (dinner_tags / weekly_plan_selections / dinner_ingredients / dinner_steps): predicate in using
```

Child → parent map:

| Child                    | Parent         | FK               | Verbs kept (matches today)     |
| ------------------------ | -------------- | ---------------- | ------------------------------ |
| `dinner_ingredients`     | `dinners`      | `dinner_id`      | select, insert, update, delete |
| `dinner_steps`           | `dinners`      | `dinner_id`      | select, insert, update, delete |
| `dinner_tags`            | `dinners`      | `dinner_id`      | select, insert, delete         |
| `weekly_plan_selections` | `weekly_plans` | `weekly_plan_id` | select, insert, delete         |

`dinner_tags` gates through **`dinners`**, not `tags` — a dinner↔tag link belongs to the dinner's
household; the shared `tags` row is itself household-scoped by its own direct policy.

### Interaction with non-definer trigger/RPC code

These run as the invoking user and are now RLS-checked. All are fine post-bolt-030 (verified by
the regression suite):

| Object                                | RLS touchpoint                                        | Why it still works                                                                                         |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `fn_weekly_plans_record_meal_history` | `insert into meal_history` (with check)               | Inserts `new.household_id` = the plan's household = caller's household                                     |
| `fn_weekly_plan_selections_guard`     | `select` / `perform` on `weekly_plans`                | Same plan, same household                                                                                  |
| `lock_weekly_plan`                    | `update weekly_plans` (using + with check)            | Plan is in caller's household                                                                              |
| `reorder_grocery_store_row`           | `select ... for update` + `update grocery_store_rows` | Only touches caller's household rows; a foreign `p_row_id` → not found → raises (the documented behaviour) |

**Null-household window note**: strictly between this migration and bolt 030's backfill, existing
rows have `household_id = null` and the founding user has no membership, so every predicate is
`null = null` → nothing is visible and `fn_weekly_plans_record_meal_history`'s `with check` would
fail. This is invisible in practice — `supabase db push` runs 026→030 with no app traffic
between migrations — but it is why the whole sequence must ship as one push.

### Security Design

| Concern                                         | Approach                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Any `using (true)` left behind                  | Migration drops every one by exact name; test asserts `pg_policies` `qual`/`with_check` = `'true'` count is 0 for the 10 tables |
| Cross-household write via forged `household_id` | `with check` on every insert/update policy                                                                                      |
| `meal_history` tampering                        | No `update` / `delete` policy created                                                                                           |
| Child row reached via foreign parent            | `exists` subquery pins the parent's `household_id`                                                                              |
| Unprovisioned caller                            | `household_id = null` → all predicates false                                                                                    |

### NFR Implementation

| Requirement                         | Design                                                                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Predicate is one indexed comparison | `household_id = current_user_household_id()` hits `idx_<t>_household_id` (bolt 027); `current_user_household_id()` is `stable` (bolt 026) so it folds to one eval per statement           |
| Child `exists` is cheap             | Parent lookup is by PK (`p.id = <fk>`)                                                                                                                                                    |
| Migration idempotent / re-runnable  | `drop policy if exists`; `create policy` (policies are dropped first, so no `if not exists` needed — but a re-run after a partial failure is safe because every drop precedes its create) |

### Integration Points

- Requires bolt 027 (the `household_id` columns + parent columns).
- Enables bolt 029 (seeded/invited households must be provably isolated) and bolt 030
  (post-migration login is tested under real RLS).
- `dinner_last_chosen` (`security_invoker`) inherits these policies automatically — story 009's
  test in bolt 027's report covers it.

### Rollback

`drop policy` the 35 new policies and recreate the original `using (true)` / `with check (true)`
set (verbatim from migrations `20260826175605`, `20260826192038`, `20260826224346`,
`20260827020000`, `20260827030000`, `20260827040000`). The full original text is reproduced in the
migration's header comment for a copy-paste revert.

### Deviations from Domain Model

None. Direct vs child predicate shapes, `meal_history` insert-only, grants unchanged — all as
modelled.
