-- Account Model: identity + household foundation
-- (intent 004-account-model, unit 001-household-data-model)
-- Stories: 001-household-profile-membership-schema, 002-current-household-helper
-- Bolt: 026-household-data-model
-- See memory-bank/bolts/026-household-data-model/ddd-02-technical-design.md for rationale.
--
-- Additive migration — creates three new tables and one function. Touches no existing table,
-- policy, function, or view. Safe to apply from scratch or on top of the current DB.
--
-- Rollback:
--   drop function if exists public.current_user_household_id();
--   drop table if exists public.household_members;
--   drop table if exists public.households;
--   drop table if exists public.profiles;

-- ---------------------------------------------------------------------------
-- 1. profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user (id = auth.users.id). Holds app-level identity (display_name). '
  'Deleted automatically when the auth user is deleted.';

-- ---------------------------------------------------------------------------
-- 2. households — the data-ownership / RLS scoping boundary
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.households is
  'The sharing boundary: every dinner/plan/store row belongs to exactly one household '
  '(household_id added to those tables in bolt 027). Rows are created only by security-definer '
  'code (handle_new_user() in bolt 029, the founding migration in bolt 030) — there is no client '
  'insert policy.';

-- ---------------------------------------------------------------------------
-- 3. household_members — profile <-> household link, one household per user
-- ---------------------------------------------------------------------------
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, profile_id),
  unique (profile_id)
);

comment on table public.household_members is
  'Links a profile to its household with a role. unique (profile_id) enforces "one household per '
  'user" for this intent; a later multi-household intent drops it. Rows are created only by '
  'security-definer provisioning code.';
comment on constraint household_members_profile_id_key on public.household_members is
  'One household per user (this intent). A second membership row for the same profile errors.';

create index if not exists idx_household_members_profile_id
  on public.household_members (profile_id);

-- ---------------------------------------------------------------------------
-- 4. current_user_household_id() — the single household resolver
--    Used as: RLS predicate everywhere (bolt 028) and column default (bolt 027).
--    MUST be defined before the policies below, which reference it.
-- ---------------------------------------------------------------------------
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

comment on function public.current_user_household_id() is
  'Returns the calling user''s single household id, or null when unauthenticated / unprovisioned '
  '(never raises). stable + scalar sub-select so the planner evaluates it once per statement. '
  'security definer + pinned search_path so it can read household_members past that table''s RLS.';

revoke all on function public.current_user_household_id() from public;
grant execute on function public.current_user_household_id() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
--    These three tables have no household_id of their own — predicates reference
--    auth.uid() and current_user_household_id() directly. No insert/delete policies:
--    identity rows are written only by security-definer code.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- profiles: readable by self or a co-member of the same household; updatable only by self.
create policy "Profile readable by self or co-members"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.household_members m_self
      join public.household_members m_other
        on m_other.household_id = m_self.household_id
      where m_self.profile_id = (select auth.uid())
        and m_other.profile_id = public.profiles.id
    )
  );

create policy "Profile updatable by self"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- households: readable by its members; updatable only by an owner member.
create policy "Household readable by its members"
  on public.households for select
  to authenticated
  using (id = public.current_user_household_id());

create policy "Household updatable by an owner"
  on public.households for update
  to authenticated
  using (
    id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members
      where household_id = public.households.id
        and profile_id = (select auth.uid())
        and role = 'owner'
    )
  )
  with check (
    id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members
      where household_id = public.households.id
        and profile_id = (select auth.uid())
        and role = 'owner'
    )
  );

-- household_members: a member may read the rows for its own household.
create policy "Household members readable by co-members"
  on public.household_members for select
  to authenticated
  using (household_id = public.current_user_household_id());
