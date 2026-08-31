---
stage: design
bolt: 029-household-data-model
created: 2026-08-29T02:18:00Z
---

## Technical Design: household-data-model (bolt 029 — provisioning)

### Architecture Pattern

Unchanged. One additive migration:
`supabase/migrations/20260828233000_account_model_provisioning.sql` (~1390 lines, almost all of it
the re-expressed seed data). Three parts: `seed_default_household_catalog()`,
`household_invites` (+ indexes + RLS), `handle_new_user()` + trigger.

### Part 1 — `seed_default_household_catalog(p_household_id uuid)` (story 005)

**How the body is produced (parity guardrail)**: a deterministic transform of the three shipped
seed migrations —

| Source migration                               | Transform                                                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20260826175606_seed_healthy_family_dinners`   | dinner insert: add `household_id`/`p_household_id`, **drop `rosie_approved`** (column no longer exists), drop `on conflict (name) do nothing`. Ingredient `values` tuples copied verbatim. |
| `20260826224346_dinner_catalog_steps`          | `where name = 'X'` → `where d.household_id = p_household_id and d.name = 'X'`; drop the `on conflict … do update`. Step `values` tuples verbatim.                                          |
| `20260828000000_grocery_store_config_defaults` | drop the `delete from …`; add `household_id`/`p_household_id` to the two inserts and the row-name join.                                                                                    |

Result by construction: **50 dinners, 284 `dinner_ingredients`, 216 `dinner_steps`, 5
`grocery_store_rows`, 5 `category_row_assignments`** — identical counts and content to a
freshly-`db reset` DB today. The generator script lives in the bolt's scratch notes; the
migration carries the generated output.

**Properties**:

- `language plpgsql`, `security definer`, `set search_path = ''`, fully schema-qualified.
- **Idempotency**: `if exists (select 1 from public.dinners where household_id = p_household_id)
then return; end if;` at the top. A second call inserts nothing. (Story 005 explicitly permits
  an existence check over `on conflict`; the child tables `dinner_ingredients` / `dinner_steps`
  have no natural unique key, so a guard is the clean choice.)
- **Grants**: `revoke all … from public;` — `authenticated` cannot execute it. Only
  `handle_new_user()` (also `security definer`) and migrations call it.
- **Atomicity**: runs in the caller's transaction. A mid-seed failure (e.g. a bad
  `p_household_id` → FK violation on the first dinner insert) rolls the whole thing back.
- `tags` are **not** seeded — matches today (every dinner starts untagged).

### Part 2 — `household_invites` (story 006)

```sql
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles(id),      -- nullable
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
create unique index household_invites_one_pending_per_email
  on public.household_invites (household_id, lower(email)) where status = 'pending';
create index household_invites_pending_email
  on public.household_invites (lower(email)) where status = 'pending';
```

**RLS** (`to authenticated`):

| Verb     | Predicate                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select` | `household_id = current_user_household_id()` — members see their household's invites                                                                                                                              |
| `insert` | `household_id = current_user_household_id()` **and** caller is an `owner` of that household                                                                                                                       |
| `update` | `using`: same owner check. `with check`: still own household **and** `status in ('pending','revoked')` — a client can revoke but cannot set `accepted` (only `handle_new_user()` does, bypassing RLS as definer). |
| `delete` | _(no policy)_ — invites are revoked, not deleted                                                                                                                                                                  |

### Part 3 — `handle_new_user()` + trigger (story 007)

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Function (`security definer`, `search_path = ''`):

1. `insert into public.profiles (id, display_name) values (new.id, null);`
2. if `new.email` is non-empty, `select * into v_invite from public.household_invites where
lower(email) = lower(new.email) and status = 'pending' order by created_at asc limit 1;`
3. **`v_invite.id is not null`** → `insert household_members(v_invite.household_id, new.id,
'member')`; `update household_invites set status = 'accepted' where id = v_invite.id`.
4. **else** → `insert into households (name) values (coalesce(nullif(split_part(email,'@',1),''),
'New') || '''s household') returning id into v_household_id;` →
   `insert household_members(v_household_id, new.id, 'owner')` →
   `perform seed_default_household_catalog(v_household_id);`
5. `return new;`

**Atomic**: the trigger runs in the `auth.users` insert transaction. Any exception (seed failure,
unique violation, etc.) aborts the whole insert — GoTrue surfaces it as a signup error; the user
retries. There is never a profile without a membership or a household without a seed.

**Null / edge email**: `coalesce(new.email,'')` guards the invite lookup; the household-name
expression guards `split_part` returning `''`. This app is email/password only, so these are
defensive, not expected.

### Security Design

| Concern                                    | Approach                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Client running the seeder directly         | `revoke all … from public` — not executable by `authenticated`            |
| Client forging an `accepted` invite        | `with check status in ('pending','revoked')` on the update policy         |
| Cross-household invite visibility/creation | select/insert policies gate on `current_user_household_id()` + owner role |
| Definer functions reading protected tables | `search_path = ''`, schema-qualified bodies, `revoke all` + no re-grant   |
| Trigger failure leaving partial state      | Runs in the auth insert txn — all-or-nothing                              |

### NFR Implementation

| Requirement                                | Design                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Trigger lookup is indexed                  | `household_invites_pending_email` on `(lower(email)) where status='pending'` |
| One pending invite per email per household | `household_invites_one_pending_per_email` partial unique index               |
| Seed parity with today's DB                | Body is a mechanical transform of the shipped seed migrations                |
| Second seed call is a no-op                | Existence guard on `public.dinners`                                          |

### Integration Points

- Requires bolts 026 (`households`, resolver), 027 (`household_id` columns + reworked
  constraints — the seeder inserts stamped rows), 028 (RLS — so "seeded household is isolated"
  tests are meaningful).
- Enables bolt 030 (a clean post-migration test needs provisioning correct) and unit
  `002-account-model-ui` (`useAuth` can assume every session has a membership).

### Rollback

`drop trigger on_auth_user_created on auth.users; drop function handle_new_user(); drop table
household_invites; drop function seed_default_household_catalog(uuid);` — in the migration header.

### Deviations from Domain Model

None. `InviteStatus` transitions, the two provisioning branches, the seeder's idempotency and
grant restriction — all as modelled.
