-- pgTAP tests for households.servings_per_dinner
-- (intent 018-serving-scale-and-removal, unit 001-serving-size-setting, bolt 069)
-- Stories: 001-servings-column, 002-servings-setting-control
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- What this proves, and why each part is here:
--   * the shape and default — the default of 3 is what makes the deploy a no-op for existing
--     households, so it is asserted rather than assumed;
--   * the 1..12 bound at BOTH edges — a bound tested at one edge is half a bound;
--   * RLS by BEHAVIOUR, not by reading policy text: an owner's write lands, a member's write
--     silently changes nothing (RLS filters UPDATE rows, it does not raise), and another household
--     cannot see the row at all. No new policy was added for this column; these cases are what
--     show the existing ones actually cover it;
--   * the column comment still carries ADR-14 — the column's MEANING is the thing most likely to
--     be misread later, and the comment is where a schema reader will look.

begin;
select plan(17);

-- Fixtures insert into auth.users; suppress handle_new_user() so this test owns the setup.
set local app.provisioning_disabled = 'on';

-- ── Schema shape ─────────────────────────────────────────────────────────────
select has_column('public', 'households', 'servings_per_dinner', 'households has servings_per_dinner');
select col_type_is('public', 'households', 'servings_per_dinner', 'smallint',
  'servings_per_dinner is a smallint, like its sibling dinners_per_week');
select col_not_null('public', 'households', 'servings_per_dinner', 'servings_per_dinner is not null');
select col_default_is('public', 'households', 'servings_per_dinner', '3',
  'servings_per_dinner defaults to 3 — what the app hard-coded before intent 018, so the deploy changes nothing for existing households');

select ok(
  col_description('public.households'::regclass,
    (select attnum from pg_attribute
      where attrelid = 'public.households'::regclass and attname = 'servings_per_dinner'))
    like '%ADR-14%',
  'the column comment cites ADR-14: this number does not describe stored dinners'
);

-- ── Fixtures: household H (owner O, member M), household X (owner XO) ────────
insert into auth.users (id, email) values
  ('0a000000-0000-4000-8000-000000000001', 'owner@serving.test'),
  ('0a000000-0000-4000-8000-000000000002', 'member@serving.test'),
  ('0a000000-0000-4000-8000-000000000003', 'other-owner@serving.test');

insert into public.profiles (id, display_name) values
  ('0a000000-0000-4000-8000-000000000001', 'Owner'),
  ('0a000000-0000-4000-8000-000000000002', 'Member'),
  ('0a000000-0000-4000-8000-000000000003', 'Other Owner');

insert into public.households (id, name) values
  ('0b000000-0000-4000-8000-00000000000a', 'Serving Household'),
  ('0b000000-0000-4000-8000-00000000000b', 'Other Household');

insert into public.household_members (household_id, profile_id, role) values
  ('0b000000-0000-4000-8000-00000000000a', '0a000000-0000-4000-8000-000000000001', 'owner'),
  ('0b000000-0000-4000-8000-00000000000a', '0a000000-0000-4000-8000-000000000002', 'member'),
  ('0b000000-0000-4000-8000-00000000000b', '0a000000-0000-4000-8000-000000000003', 'owner');

select is(
  (select servings_per_dinner from public.households where id = '0b000000-0000-4000-8000-00000000000a'),
  3::smallint,
  'a newly created household gets the default of 3'
);

-- ── The 1..12 bound, at both edges (as the table owner, so RLS is not the thing under test) ──
select throws_ok(
  $$ update public.households set servings_per_dinner = 0 where id = '0b000000-0000-4000-8000-00000000000a' $$,
  '23514', null, 'servings_per_dinner rejects 0 — the lower edge'
);
select throws_ok(
  $$ update public.households set servings_per_dinner = 13 where id = '0b000000-0000-4000-8000-00000000000a' $$,
  '23514', null, 'servings_per_dinner rejects 13 — the upper edge'
);
select lives_ok(
  $$ update public.households set servings_per_dinner = 1 where id = '0b000000-0000-4000-8000-00000000000a' $$,
  'servings_per_dinner accepts 1 — cooking for one is coherent'
);
select lives_ok(
  $$ update public.households set servings_per_dinner = 12 where id = '0b000000-0000-4000-8000-00000000000a' $$,
  'servings_per_dinner accepts 12 — the sanity bound, inclusive'
);
update public.households set servings_per_dinner = 3 where id = '0b000000-0000-4000-8000-00000000000a';

-- ── RLS, by behaviour ────────────────────────────────────────────────────────
-- The owner writes, and the write lands.
set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update public.households set servings_per_dinner = 5 where id = '0b000000-0000-4000-8000-00000000000a' $$,
  'an owner can update servings_per_dinner'
);
reset role;
select is(
  (select servings_per_dinner from public.households where id = '0b000000-0000-4000-8000-00000000000a'),
  5::smallint,
  'the owner''s write landed'
);

-- The member can READ it (member SELECT)…
set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;
select is(
  (select servings_per_dinner from public.households where id = '0b000000-0000-4000-8000-00000000000a'),
  5::smallint,
  'a member can read servings_per_dinner'
);
-- …but a member's UPDATE is filtered by the owner-UPDATE policy: no error, no rows changed.
select lives_ok(
  $$ update public.households set servings_per_dinner = 9 where id = '0b000000-0000-4000-8000-00000000000a' $$,
  'a member''s update does not raise (RLS filters rows, it does not throw)'
);
reset role;
select is(
  (select servings_per_dinner from public.households where id = '0b000000-0000-4000-8000-00000000000a'),
  5::smallint,
  'but a member''s update changed nothing — the value is still the owner''s 5'
);

-- Another household cannot see this household's row at all.
set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-000000000003","role":"authenticated"}';
set local role authenticated;
select is(
  (select count(*)::int from public.households where id = '0b000000-0000-4000-8000-00000000000a'),
  0,
  'another household cannot read this household''s servings_per_dinner'
);
reset role;

-- ── ADR-14: changing the setting touches no dinner ───────────────────────────
-- There is nothing to trigger, and this asserts there is still nothing: if a future migration adds
-- a trigger on households that rescales dinner quantities, this count moves and the test says why.
select is(
  (select count(*)::int from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
    where c.relname = 'households' and not t.tgisinternal
      and pg_get_triggerdef(t.oid) ilike '%servings%'),
  0,
  'no trigger reacts to servings_per_dinner — changing it rescales no stored dinner (ADR-14)'
);

select * from finish();
rollback;
