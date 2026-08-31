---
stage: design
bolt: 026-household-data-model
created: 2026-08-28T23:36:00Z
---

## Technical Design: household-data-model (bolt 026)

### Architecture Pattern

Unchanged from the project: client-heavy SPA over Supabase, **RLS is the only access-control
boundary**, invariants live in Postgres (`ADR-1`). This bolt adds three tables and one function
via a single additive migration. No frontend change (that is bolt 031).

### Layer Structure

```text
┌─────────────────────────────┐
│ Presentation                │  (none this bolt — useAuth wiring is bolt 031)
├─────────────────────────────┤
│ Application                  │  (none — no RPC; provisioning is bolt 029)
├─────────────────────────────┤
│ Domain / Infrastructure      │  profiles, households, household_members tables
│                              │  current_user_household_id() resolver
│                              │  RLS policies on all three tables
└─────────────────────────────┘
```

### Migration

**File**: `supabase/migrations/20260828230000_account_model_identity_household.sql` (additive;
edits nothing).

**Order within the file** (matters — story `001`'s RLS references the story `002` function):

1. `create table public.profiles`
2. `create table public.households`
3. `create table public.household_members` (+ index on `profile_id`)
4. `create function public.current_user_household_id()` — **before** any policy that uses it
5. `alter table ... enable row level security` on all three
6. policies

### Data Model

| Table               | Columns                                                                                                                         | Keys / constraints                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`          | `id uuid`, `display_name text`, `created_at timestamptz not null default now()`                                                 | PK `id`; `id references auth.users(id) on delete cascade`                                                                                                                                                                    |
| `households`        | `id uuid default gen_random_uuid()`, `name text not null`, `created_at timestamptz not null default now()`                      | PK `id`                                                                                                                                                                                                                      |
| `household_members` | `household_id uuid not null`, `profile_id uuid not null`, `role text not null`, `created_at timestamptz not null default now()` | PK `(household_id, profile_id)`; `unique (profile_id)`; `check (role in ('owner','member'))`; FKs to `households(id)` and `profiles(id)`, both `on delete cascade`; index `idx_household_members_profile_id on (profile_id)` |

### Function: `current_user_household_id()`

```sql
create or replace function public.current_user_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id
  from public.household_members
  where profile_id = (select auth.uid())
$$;

revoke all on function public.current_user_household_id() from public;
grant execute on function public.current_user_household_id() to authenticated, anon;
```

- `stable` — value cannot change within a statement, so the planner folds the RLS predicate to a
  single evaluation per statement (verified by `explain` in the test suite).
- `security definer` + `set search_path = ''` — reads `household_members` past its own RLS;
  pinned search path is the standard definer hardening. All object references are schema-qualified.
- Scalar subquery form: `where profile_id = auth.uid()` on a `unique (profile_id)` table returns
  at most one row, so the bare `select` is a scalar. `anon` (no JWT) → `auth.uid()` is null →
  zero rows → `null`. Never raises.
- `grant ... to anon` as well as `authenticated`: harmless (returns null for anon) and lets
  policies that also apply `to anon` short-circuit cleanly.

### RLS Policies (this bolt's 3 tables — 8 policies)

These tables have **no `household_id` of their own**; their predicates reference `auth.uid()` and
`current_user_household_id()` directly.

| Table               | Verb     | `using` / `with check`                                                                                                                                                                                                                                   |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`          | `select` | `id = (select auth.uid()) or exists (select 1 from public.household_members m1 join public.household_members m2 on m1.household_id = m2.household_id where m1.profile_id = (select auth.uid()) and m2.profile_id = profiles.id)` — self **or** co-member |
| `profiles`          | `update` | `using (id = (select auth.uid()))` / `with check (id = (select auth.uid()))`                                                                                                                                                                             |
| `households`        | `select` | `id = public.current_user_household_id()`                                                                                                                                                                                                                |
| `households`        | `update` | `using` + `with check`: `id = public.current_user_household_id() and exists (select 1 from public.household_members where household_id = households.id and profile_id = (select auth.uid()) and role = 'owner')`                                         |
| `household_members` | `select` | `household_id = public.current_user_household_id()`                                                                                                                                                                                                      |

- **No `insert` / `delete` policies** on any of the three (matching story `001`'s technical
  note): rows are written only by `security definer` code (`handle_new_user()` bolt 029, founding
  migration bolt 030) which bypasses RLS. `profiles` update is self-only; `households` update is
  owner-only; there is deliberately no way for a client to create or destroy identity rows.
- `to authenticated` on every policy. `anon` gets nothing.
- `(select auth.uid())` wrapped in a scalar sub-select — the Supabase-recommended form so the
  planner caches it per statement (same optimization as `current_user_household_id()` being
  `stable`).

### Security Design

| Concern                                    | Approach                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Definer function reading a protected table | `search_path = ''`, fully schema-qualified body, `revoke all from public` then explicit grant |
| Privilege escalation via `role`            | No client write path to `household_members`; `role` is set only by definer provisioning code  |
| Cross-household profile enumeration        | `profiles` select is self-or-co-member only; not `using (true)`                               |
| Unprovisioned / anon caller                | `current_user_household_id()` returns `null`; `null = <uuid>` is `null` → policy denies       |

### NFR Implementation

| Requirement                                                 | Design                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Resolver hits a 1-row indexed lookup                        | `unique (profile_id)` **is** the index; lookup is by that key                                  |
| Resolver evaluated once per statement                       | `stable` + scalar sub-select form; asserted with `explain` in the test suite                   |
| Migration applies from scratch **and** on top of current DB | Pure `create` / `create or replace`; `if not exists` on table + index creates; no data touched |

### Integration Points

- **`auth.users`** — `profiles.id` FK target and (bolt 029) the trigger surface. This bolt only
  references it as an FK.
- **Bolt 027** consumes `current_user_household_id()` as a column `default`.
- **Bolt 028** consumes it as the RLS predicate for all 10 domain tables.
- **Bolt 031** (`useAuth`) reads `profiles` + `household_members` for the client context.

### Rollback

Single migration, no data written. Reverse = `drop function public.current_user_household_id();`
then `drop table public.household_members, public.households, public.profiles;` (reverse FK
order). Documented as a comment block at the top of the migration.

### Deviations from Domain Model

None. `Role` stays a `check` constraint (not an enum), `Profile` and `Household` are separate
aggregates, and the resolver is the single `HouseholdResolver` service — all as modelled.
