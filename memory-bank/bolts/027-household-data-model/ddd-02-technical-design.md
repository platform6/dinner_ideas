---
stage: design
bolt: 027-household-data-model
created: 2026-08-29T00:18:00Z
---

## Technical Design: household-data-model (bolt 027)

### Architecture Pattern

Unchanged. One additive migration:
`supabase/migrations/20260828231000_account_model_household_id_columns.sql`. It (a) adds a
nullable `household_id` to six parent tables, (b) reworks four
unique/PK constraints to be household-scoped, (c) indexes the new columns, and (d)
`create or replace`s two DB functions. It edits no shipped migration.

### The three-phase column staging (READ FIRST — this is the crux)

`household_id` cannot be `not null` yet: there is no founding household to point ~50 existing
dinners + plans + store rows at until bolt 030. So:

| Phase            | Bolt | What happens                                                                                                                                                                                                                                                                           |
| ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **add**          | 027  | `add column household_id uuid ... default public.current_user_household_id()` — **nullable**. Existing rows get `null`. New rows self-assign. Constraints reworked with `unique nulls not distinct` so today's global uniqueness still holds while every row's `household_id` is null. |
| **backfill**     | 030  | Founding `households` row created; `update <table> set household_id = <founding id> where household_id is null` for every direct-column table; child tables need nothing.                                                                                                              |
| **set not null** | 030  | `alter table <table> alter column household_id set not null` on the six direct-column tables; `category_row_assignments` PK promoted from the interim unique to `(household_id, category)`.                                                                                            |

**Deploy consequence**: the `026 → 030` migrations must ship as one `supabase db push`. Between
bolt 028 (RLS rewrite) and bolt 030 (backfill), existing rows have `household_id = null` and the
founding user has no membership yet, so `household_id = current_user_household_id()` is
`null = null` → the app would show nothing. `db push` applies all pending migrations in sequence
with no app traffic in between, so there is no user-visible broken window — but do not push a
partial subset.

### Layer Structure

```text
┌─────────────────────────────┐
│ Presentation                │  (bolt 031 — assignCategory conflict target)
├─────────────────────────────┤
│ Application                  │  reorder_grocery_store_row RPC  (scoped here)
├─────────────────────────────┤
│ Domain                       │  fn_weekly_plans_record_meal_history trigger (scoped here)
│                              │  dinner_last_chosen view          (unchanged — security_invoker)
├─────────────────────────────┤
│ Infrastructure               │  household_id column + FK + index on 6 tables
│                              │  4 reworked constraints
└─────────────────────────────┘
```

### Data Model — column adds (6 tables)

For each of `dinners`, `tags`, `grocery_store_rows`, `category_row_assignments`, `weekly_plans`,
`meal_history`:

```sql
alter table public.<t>
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();

create index if not exists idx_<t>_household_id on public.<t> (household_id);
```

- `default public.current_user_household_id()` — schema-qualified so it resolves regardless of the
  session `search_path` at insert time.
- `on delete cascade` — deleting a household removes its data. There is no household-deletion flow
  in this intent, but the FK must be correct.
- **No** column on `dinner_ingredients`, `dinner_steps`, `dinner_tags`, `weekly_plan_selections` —
  their household is the parent's, enforced in bolt 028's RLS via `exists (... parent ...)`.
- `meal_history.household_id` also gets the default, but the lock trigger writes it explicitly
  from the parent plan (below), so the default only matters for a hypothetical direct insert.

### Data Model — constraint reworks (4)

| Table                      | Drop                                                                                   | Add                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `tags`                     | `tags_name_key` (`unique (name)`)                                                      | `unique nulls not distinct (household_id, name)`. `check (name = lower(name))` untouched.                                                   |
| `grocery_store_rows`       | `grocery_store_rows_position_key`                                                      | `unique nulls not distinct (household_id, position)`                                                                                        |
| `category_row_assignments` | `category_row_assignments_pkey` (PK on `category`)                                     | interim `unique nulls not distinct (household_id, category)` + `alter column category set not null`. Bolt 030 promotes this to the real PK. |
| `weekly_plans`             | `idx_weekly_plans_one_unlocked` (partial unique on `((true)) where locked_at is null`) | `create unique index idx_weekly_plans_one_unlocked on public.weekly_plans (household_id) nulls not distinct where locked_at is null`        |

`nulls not distinct` is the key trick: while every row's `household_id` is null (the 027→030
window) all null-household rows collapse into one namespace, so "globally unique tag name",
"globally contiguous positions", and "one unlocked plan globally" all still hold — exactly
today's behaviour. Once bolt 030 backfills real ids, the same constraints become per-household
with no further DDL.

### Function updates (`create or replace`)

**`fn_weekly_plans_record_meal_history()`** — add `household_id` to the insert, sourced from the
locking plan:

```sql
insert into public.meal_history (weekly_plan_id, dinner_id, week_start_date, household_id)
select new.id, wps.dinner_id, new.start_date, new.household_id
from public.weekly_plan_selections wps
where wps.weekly_plan_id = new.id
on conflict (weekly_plan_id, dinner_id) do nothing;
```

Trigger definition (`after update ... when (old.locked_at is null and new.locked_at is not null)`)
is **not** re-created — only the function body changes.

**`reorder_grocery_store_row(p_row_id uuid, p_new_position integer)`** — derive the household from
the target row (under the existing `for update` lock) and filter every subsequent statement by it:

- `select position, household_id into v_old_position, v_household_id ... where id = p_row_id for update;`
- range check: `select count(*) ... where household_id is not distinct from v_household_id;`
- both shift `update`s and both final `return query` selects gain
  `where household_id is not distinct from v_household_id and ...`
- `is not distinct from` (not `=`) so the RPC still works during the null-household window; it
  degrades to `=` once ids are real.
- The `position = -1` sentinel is unchanged; with the new per-household unique it is now _safer_
  (two households can each hold a `-1` mid-reorder). The pre-existing same-household
  concurrent-reorder-of-different-rows race is out of scope (story `009`: "no functional
  change") and unchanged.

**`dinner_last_chosen`** — **not touched**. `security_invoker = true` + bolt 028 RLS on the three
underlying tables makes it per-household automatically. Story `009`'s criterion is a passing
two-household test; the view definition is adjusted only if that test shows a leak (it will not).

### Unchanged, regression-only

`lock_weekly_plan`, `fn_weekly_plan_selections_guard`, `fn_weekly_plans_require_three_on_lock`,
`fn_weekly_plans_block_edit_after_lock`. Each gets a case in the extended
`weekly_planning_test.sql` proving unchanged behaviour on the new schema.

### Security Design

| Concern                                      | Approach                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| New row leaking to wrong household           | `default current_user_household_id()`; bolt 028 `with check` rejects an explicit foreign id |
| Cross-household reorder corrupting positions | RPC filters every write by the target row's household; RLS blocks reaching a foreign row    |
| Uniqueness bypass during the null window     | `unique nulls not distinct` preserves global uniqueness until backfill                      |
| `meal_history` row with wrong household      | Written only by the trigger, from `new.household_id` of the locked plan                     |

### NFR Implementation

| Requirement                               | Design                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| One index per new `household_id` column   | 6 `create index if not exists idx_<t>_household_id`                                                                    |
| Positions stay contiguous per household   | RPC scoping + `unique nulls not distinct (household_id, position)`                                                     |
| Migration applies from scratch and on top | `add column if not exists`, `drop constraint if exists`, `create ... if not exists`; `create or replace` for functions |
| No lock-semantics change                  | Trigger definitions untouched; regression suite proves it                                                              |

### Integration Points

- Depends on bolt 026 (`households`, `current_user_household_id()`).
- Enables bolt 028 (RLS needs these columns), bolt 030 (backfills them), bolt 031 (types regen +
  `assignCategory` conflict target).

### Rollback

Reverse the function `create or replace` to the prior bodies (kept in the shipped migrations
`20260827030000` and `20260827040000`); `drop constraint` the new uniques and restore the
originals; `drop column household_id` from the six tables (drops the indexes with them). Full
sequence in the migration's header comment.

### Deviations from Domain Model

None. Child tables get no column; the view is unchanged; the two updated functions match the
"MealHistoryRecorder" / "StoreRowReorderer" service descriptions.
