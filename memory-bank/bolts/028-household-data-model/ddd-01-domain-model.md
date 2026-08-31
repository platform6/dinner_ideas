---
stage: model
bolt: 028-household-data-model
created: 2026-08-29T01:04:00Z
---

## Static Model: household-data-model (bolt 028 — the RLS rewrite)

No new tables, columns, functions, or entities. This bolt replaces **all 35 `using (true)` /
`with check (true)` policies** across the 10 domain tables from intent `001-weekly-dinner-planner`
with household-scoped policies. It is isolated in its own bolt purely because it is the highest-
risk change and its test surface (a select/insert/update/delete isolation matrix per table) is
the bolt's whole job.

### Bounded Context

Still the Dinner-Planner context. The only thing that changes is the **access rule** attached to
each aggregate: from "any authenticated session" to "the session whose
`current_user_household_id()` matches this row's household".

### Domain Rule (the one invariant this bolt encodes)

> **Household isolation**: a member of household B can neither read nor write any `dinners`,
> `dinner_ingredients`, `dinner_steps`, `tags`, `dinner_tags`, `weekly_plans`,
> `weekly_plan_selections`, `meal_history`, `grocery_store_rows`, or `category_row_assignments`
> row that belongs to household A. Enforced entirely by RLS (`ADR-1` — the DB is the only
> enforcement point).

### Predicate shapes

| Table class | Tables                                                                                                                             | `using` / `with check` predicate                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Direct**  | `dinners`, `tags`, `weekly_plans`, `meal_history`, `grocery_store_rows`, `category_row_assignments`                                | `household_id = public.current_user_household_id()`                                                                   |
| **Child**   | `dinner_ingredients` → `dinners`, `dinner_steps` → `dinners`, `dinner_tags` → `dinners`, `weekly_plan_selections` → `weekly_plans` | `exists (select 1 from <parent> p where p.id = <child>.<fk> and p.household_id = public.current_user_household_id())` |

### Invariant preservation

- **`meal_history` immutability** (`ADR-2` / the domain model of bolt 010): keep it **insert-only**
  — recreate only its `select` and `insert` policies, no `update` / `delete`. The absence of those
  policies _is_ the immutability enforcement.
- **Grants unchanged**: every policy stays `to authenticated`. Only predicates change. `anon`
  continues to get nothing.
- **`security definer` code bypasses RLS by design**: `handle_new_user()` (bolt 029), the founding
  migration (bolt 030), and the seed routine (bolt 029) set `household_id` explicitly and are not
  gated by these policies. `current_user_household_id()` itself is `security definer` so the
  predicate can resolve even though `household_members` has its own RLS.

### Edge behaviour

| Caller state                                       | Result                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| No membership → `current_user_household_id()` null | Every predicate is `household_id = null` → `null` → **0 rows, all writes denied** |
| `anon`                                             | `to authenticated` excludes it entirely                                           |
| Child row whose parent is momentarily missing      | `exists(...)` false → invisible (FKs make a true orphan impossible)               |
| Member of B inserts a row with `household_id = A`  | `with check` evaluates `A = <B's id>` → false → **rejected**                      |

### Domain Events

- **PoliciesRescoped** (marker): the 35 policies are dropped and recreated in one migration. No
  runtime event.

### Ubiquitous Language

- **Direct policy**: gates on the row's own `household_id`.
- **Child policy**: gates on the parent row's `household_id` via `exists`, never a join back to
  `households`.
- **Isolation matrix**: the per-table × {select, insert, update, delete} test grid that is this
  bolt's acceptance evidence.
- **`qual = 'true'` count**: the `pg_policies` self-check — must read `0` for domain tables after
  the migration.

### Relevant Prior Decision

`ADR-1` is the whole basis: with no application server, RLS is the only place household isolation
can be enforced. This bolt is a direct, un-novel application of it — **no new ADR**. (`ADR-2`'s
insert-only `meal_history` shape is preserved, not changed.)
