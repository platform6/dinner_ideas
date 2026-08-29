---
stage: design
bolt: 030-household-data-model
created: 2026-08-29T03:14:00Z
---

## Technical Design: household-data-model (bolt 030 — founding migration + docs)

### Part 1 — Founding-household migration (story 008)

**File**: `supabase/migrations/20260828234000_account_model_founding_household.sql`. Additive;
edits no shipped migration. **Runs against real production data** — the `ddd` here is deliberately
concrete about the exact statements.

**Structure**:

```sql
do $founding$
declare
  v_household_id constant uuid := '00000000-0000-4000-8000-000000000001';  -- fixed → dev re-run safe
  v_user_id uuid;
begin
  if exists (select 1 from public.households where id = v_household_id) then
    raise notice 'founding household already present — skipping';
    return;
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = 'garrett.peter.conn@gmail.com'
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception
      'founding user garrett.peter.conn@gmail.com not found in auth.users — aborting';
  end if;

  insert into public.households (id, name) values (v_household_id, 'Conn household');
  insert into public.profiles (id, display_name) values (v_user_id, null)
    on conflict (id) do nothing;
  insert into public.household_members (household_id, profile_id, role)
    values (v_household_id, v_user_id, 'owner')
    on conflict (profile_id) do nothing;

  update public.dinners                  set household_id = v_household_id where household_id is null;
  update public.tags                     set household_id = v_household_id where household_id is null;
  update public.grocery_store_rows       set household_id = v_household_id where household_id is null;
  update public.category_row_assignments set household_id = v_household_id where household_id is null;
  update public.weekly_plans             set household_id = v_household_id where household_id is null;
  update public.meal_history             set household_id = v_household_id where household_id is null;
end;
$founding$;

alter table public.dinners                  alter column household_id set not null;
alter table public.tags                     alter column household_id set not null;
alter table public.grocery_store_rows       alter column household_id set not null;
alter table public.category_row_assignments alter column household_id set not null;
alter table public.weekly_plans             alter column household_id set not null;
alter table public.meal_history             alter column household_id set not null;

alter table public.category_row_assignments
  drop constraint if exists category_row_assignments_household_id_category_key;
alter table public.category_row_assignments
  add constraint category_row_assignments_pkey primary key (household_id, category);
```

**Why each choice**:

- **Fixed UUID** `00000000-0000-4000-8000-000000000001` (a valid v4-shaped uuid) + the
  `if exists … return` guard → re-running the migration in dev is a safe no-op. Production runs
  it exactly once.
- **Hard `raise exception`** when the founding user is absent (`ADR-3`): the migration must not
  invent an owner. If it aborts, the DBA creates the auth user (or fixes the email) and re-runs.
- **`on conflict do nothing`** on `profiles` / `household_members`: tolerates a prior aborted run
  that got partway.
- **`update … where household_id is null`**: only stamps pre-intent rows. Any row created after
  bolt 027 already has a `household_id` from the default and is left alone. In practice the whole
  `026→030` set ships together, so every existing row is null at this point.
- **Child tables** (`dinner_ingredients`, `dinner_steps`, `dinner_tags`,
  `weekly_plan_selections`) get no update — they have no column; RLS reaches their household
  through the (now non-null) parent.
- **`set not null` after** the backfill — the table scan it does will pass because step 4 left
  zero nulls.
- **`category_row_assignments` PK promotion**: bolt 027 dropped the `category`-only PK and added
  an interim `unique nulls not distinct (household_id, category)`. Now that `household_id` is
  `not null`, drop that interim unique and add the real composite PK. This is the conflict target
  bolt 031's `assignCategory` upsert switches to.

**Post-migration state**: one household, founding user is `owner`, zero null `household_id`
anywhere, `category_row_assignments` keyed by `(household_id, category)`. The founding login sees
an unchanged app.

**Rollback** (in the migration header): `alter table … alter column household_id drop not null`
on the 6 tables; restore `category_row_assignments` to its interim unique (or original
`category` PK); `update … set household_id = null`; `delete from household_members / profiles /
households where …` the founding rows. **Data is retained** — only the household linkage is
removed. A true revert also needs bolts 026–029 rolled back (their headers cover that).

### Part 2 — Standards-doc updates (story 010)

Surgical edits only — replace the stale claims, keep everything else.

| File                               | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `standards/system-architecture.md` | "Security Patterns" section: replace "All authenticated household sessions share the same access level (no per-user roles needed at this scale)." with the three-tier model (`auth.users` → `profiles` → `households` / `household_members`), `household_id` on every domain table, `current_user_household_id()` as the universal RLS predicate, and `handle_new_user()` provisioning. Add a "Deferred" line (registration UI → `007-auth-flows`, settings → `008-account-settings`, multi-household → future). |
| `standards/tech-stack.md`          | "Authentication" section: replace "Single shared login for the household (not per-user accounts) — this is a private tool… No public signup flow." with public email/password registration, one household per user, invite-based joining. Update the "Decision Relationships" bullet that calls the auth "intentionally minimal … two-person household tool".                                                                                                                                                    |
| `standards/coding-standards.md`    | File-tree comment `auth/ # shared household login` → `auth/ # email/password auth + household context`.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `standards/decision-index.md`      | Add `ADR-3` entry (this bolt); bump `total_decisions` 2 → 3, refresh `last_updated`.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `standards/ux-guide.md`            | Left as-is — "two-person household app" is still true for the founding household and does not contradict the model (story 010 note).                                                                                                                                                                                                                                                                                                                                                                             |

### Testing (story 008)

`supabase/tests/database/account_model_founding_household_test.sql` — since pgTAP runs in a
transaction with **no pre-existing global data and no founding auth user**, it tests the
migration's _logic_ by:

- asserting the guard: calling the founding `do` block body against an empty `auth.users` raises;
- seeding a fake "legacy" state (rows with `household_id = null` + an `auth.users` row for the
  founding email) inside the test txn, running the backfill statements, and asserting zero nulls
  - the founding `owner` membership + row content unchanged;
- asserting the six columns are `not null` and `category_row_assignments` PK is
  `(household_id, category)` **after** the migration (these DDL statements run outside the `do`
  block, so they are already applied when the test runs).

The **real** production cutover is verified manually at push time (see the test report).

### Deviations from Domain Model

None. One founding household, hard-fail on missing owner, stamp-not-seed, zero-null invariant —
all as modelled. `ADR-3` records the cutover decision.
