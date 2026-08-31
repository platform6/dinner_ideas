-- pgTAP tests for the provisioning slice (bolt 029-household-data-model; stories 005, 006, 007)
-- Run locally via: supabase test db
--
-- Assumes bolts 026 + 027 + 028 + 029 migrations are applied. Exercises the seed routine parity
-- + idempotency, household_invites shape + RLS, and both handle_new_user() branches by inserting
-- directly into auth.users (the trigger is on the table, so this is a faithful signup simulation).

begin;
select plan(25);

-- ── seed_default_household_catalog: shape + grants ──────────────────────────
select has_function('public', 'seed_default_household_catalog', array['uuid'],
  'seed_default_household_catalog(uuid) exists');
select is(
  (select prosecdef from pg_proc where proname = 'seed_default_household_catalog'),
  true, 'seed_default_household_catalog is SECURITY DEFINER');
select ok(
  not has_function_privilege('authenticated', 'public.seed_default_household_catalog(uuid)', 'execute'),
  'authenticated cannot EXECUTE seed_default_household_catalog');

-- ── seed parity: an empty household ends up with today's default catalog ────
insert into public.households (id, name) values
  ('5eed0000-0000-0000-0000-000000000000', 'Seed Target');
select lives_ok(
  $$ select public.seed_default_household_catalog('5eed0000-0000-0000-0000-000000000000') $$,
  'seed routine runs against an empty household');

select is((select count(*)::int from public.dinners
           where household_id = '5eed0000-0000-0000-0000-000000000000'),
          50, 'seeded household has 50 dinners');
select is((select count(*)::int from public.dinner_ingredients di
           join public.dinners d on d.id = di.dinner_id
           where d.household_id = '5eed0000-0000-0000-0000-000000000000'),
          284, 'seeded household has 284 dinner_ingredients');
select is((select count(*)::int from public.dinner_steps ds
           join public.dinners d on d.id = ds.dinner_id
           where d.household_id = '5eed0000-0000-0000-0000-000000000000'),
          216, 'seeded household has 216 dinner_steps');
select is((select count(*)::int from public.grocery_store_rows
           where household_id = '5eed0000-0000-0000-0000-000000000000'),
          5, 'seeded household has 5 store rows');
select is((select count(*)::int from public.category_row_assignments
           where household_id = '5eed0000-0000-0000-0000-000000000000'),
          5, 'seeded household has 5 category assignments');
select is((select count(*)::int from public.tags
           where household_id = '5eed0000-0000-0000-0000-000000000000'),
          0, 'seeded household has 0 tags (dinners start untagged, matching today)');
select is(
  (select array_agg(name order by position) from public.grocery_store_rows
   where household_id = '5eed0000-0000-0000-0000-000000000000'),
  array['Dairy','Grains','Pantry','Produce','Protein'],
  'seeded store rows match the shipped default order');

-- ── idempotency: a second call inserts nothing ────────────────────────────
select lives_ok(
  $$ select public.seed_default_household_catalog('5eed0000-0000-0000-0000-000000000000') $$,
  'second seed call does not error');
select is((select count(*)::int from public.dinners
           where household_id = '5eed0000-0000-0000-0000-000000000000'),
          50, 'second seed call added no dinners (idempotent)');

-- ── household_invites shape + partial unique ──────────────────────────────
select has_table('public', 'household_invites', 'household_invites table exists');
select has_index('public', 'household_invites', 'household_invites_one_pending_per_email',
  'partial unique index for one-pending-per-email exists');
insert into public.households (id, name) values
  ('c1000000-0000-0000-0000-000000000000', 'Inviter HH');
insert into public.household_invites (household_id, email) values
  ('c1000000-0000-0000-0000-000000000000', 'Friend@Example.com');
select throws_ok(
  $$ insert into public.household_invites (household_id, email)
     values ('c1000000-0000-0000-0000-000000000000', 'friend@example.com') $$,
  '23505', null,
  'a second pending invite for the same email+household is rejected (case-insensitive)');

-- ── handle_new_user: FRESH path (no invite) ──────────────────────────────
insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'brand.new@example.test');
select is((select count(*)::int from public.profiles where id = 'f0000000-0000-0000-0000-000000000001'),
          1, 'fresh signup: 1 profile created');
select is((select count(*)::int from public.household_members
           where profile_id = 'f0000000-0000-0000-0000-000000000001' and role = 'owner'),
          1, 'fresh signup: 1 owner membership created');
select is(
  (select count(*)::int from public.dinners d
   join public.household_members hm on hm.household_id = d.household_id
   where hm.profile_id = 'f0000000-0000-0000-0000-000000000001'),
  50, 'fresh signup: the new household got the full 50-dinner seed');
select is(
  (select name from public.households h
   join public.household_members hm on hm.household_id = h.id
   where hm.profile_id = 'f0000000-0000-0000-0000-000000000001'),
  'brand.new''s household',
  'fresh signup: household name is "<email local-part>''s household"');

-- ── handle_new_user: INVITE path ────────────────────────────────────────
insert into public.household_invites (household_id, email, created_at) values
  ('c1000000-0000-0000-0000-000000000000', 'joiner@example.test', now() - interval '1 hour');
insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000002', 'Joiner@example.test');  -- case-insensitive match
select is((select count(*)::int from public.household_members
           where profile_id = 'f0000000-0000-0000-0000-000000000002'),
          1, 'invited signup: exactly 1 membership');
select is((select role from public.household_members
           where profile_id = 'f0000000-0000-0000-0000-000000000002'),
          'member', 'invited signup: joined as member, not owner');
select is((select household_id from public.household_members
           where profile_id = 'f0000000-0000-0000-0000-000000000002'),
          'c1000000-0000-0000-0000-000000000000'::uuid,
          'invited signup: joined the inviting household');
select is((select status from public.household_invites where email = 'joiner@example.test'),
          'accepted', 'invited signup: the invite is now accepted');
select is(
  (select count(*)::int from public.dinners d
   join public.household_members hm on hm.household_id = d.household_id
   where hm.profile_id = 'f0000000-0000-0000-0000-000000000002'),
  0, 'invited signup: no catalog seeded (joined an existing household)');

select * from finish();
rollback;
