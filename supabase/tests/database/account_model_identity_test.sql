-- pgTAP tests for the account-model identity foundation (bolt 026-household-data-model)
-- Stories: 001-household-profile-membership-schema, 002-current-household-helper
-- Run locally via: supabase test db   (requires Docker/local Postgres + pgTAP)
--
-- Covers: table shape, one-household-per-user uniqueness, current_user_household_id()
-- resolution (member / unmembered / anon), function volatility + grants, and RLS isolation
-- between two households.

begin;
select plan(19);

-- These fixtures insert into auth.users; suppress handle_new_user() so this test controls the
-- household setup explicitly (the trigger's fresh-household + seed path is covered by
-- account_model_provisioning_test.sql).
set local app.provisioning_disabled = 'on';

-- ── Schema shape ─────────────────────────────────────────────────────────────
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'households', 'households table exists');
select has_table('public', 'household_members', 'household_members table exists');
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select col_is_pk('public', 'household_members', array['household_id', 'profile_id'],
  'household_members PK is (household_id, profile_id)');
select col_is_unique('public', 'household_members', array['profile_id'],
  'household_members.profile_id is unique (one household per user)');
select has_index('public', 'household_members', 'idx_household_members_profile_id',
  'index on household_members(profile_id) exists');
select function_returns('public', 'current_user_household_id', 'uuid',
  'current_user_household_id() returns uuid');
select is(
  (select provolatile from pg_proc where proname = 'current_user_household_id'),
  's', 'current_user_household_id() is STABLE');
select is(
  (select prosecdef from pg_proc where proname = 'current_user_household_id'),
  true, 'current_user_household_id() is SECURITY DEFINER');

-- ── Fixtures: two auth users, two profiles, one household with one member ─────
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a-owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b-owner@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'unmembered@example.test');

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'A Owner'),
  ('22222222-2222-2222-2222-222222222222', 'B Owner'),
  ('33333333-3333-3333-3333-333333333333', 'Nobody');

insert into public.households (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Household A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Household B');

insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

-- ── One household per user ──────────────────────────────────────────────────
select throws_ok(
  $$ insert into public.household_members (household_id, profile_id, role)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
             '11111111-1111-1111-1111-111111111111', 'member') $$,
  '23505', null,
  'a second household_members row for the same profile is rejected (unique violation)'
);

-- ── current_user_household_id() resolution ──────────────────────────────────
set local role authenticated;

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(
  public.current_user_household_id(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'resolver returns household A for member A'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is(
  public.current_user_household_id(), null,
  'resolver returns null for an authenticated user with no membership'
);

reset role;
set local role anon;
set local request.jwt.claims = '';
select is(
  public.current_user_household_id(), null,
  'resolver returns null for anon (no JWT)'
);
reset role;

-- ── RLS isolation ──────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq(
  $$ select name from public.households $$,
  $$ values ('Household A') $$,
  'member A sees only household A'
);

select is(
  (select count(*)::int from public.household_members),
  1,
  'member A sees only its own household_members row'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'member A sees only its own profile (no co-members in household A)'
);

-- owner-only household update
select lives_ok(
  $$ update public.households set name = 'Household A (renamed)'
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'owner A can rename household A'
);

select is(
  (select count(*)::int from public.households
   where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'owner A cannot see household B to update it (RLS hides the row)'
);

reset role;

select * from finish();
rollback;
