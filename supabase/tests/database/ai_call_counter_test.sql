-- pgTAP for intent 008 bolt 040: ai_call_counter + reserve_ai_call().
-- (unit 001-claude-proxy-hardening; story 002-count-genuine-usage-atomic-cap)
-- Run locally via: supabase test db
--
-- Seeds two households: A (owner a1) and B (owner b2, member c3).

begin;
select plan(17);

set local app.provisioning_disabled = 'on';

-- ── Fixtures ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('a1a1a1a1-0000-0000-0000-0000000000c1', 'a-cnt@example.test'),
  ('b2b2b2b2-0000-0000-0000-0000000000c2', 'b-cnt@example.test'),
  ('c3c3c3c3-0000-0000-0000-0000000000c3', 'c-cnt@example.test');
insert into public.profiles (id, display_name) values
  ('a1a1a1a1-0000-0000-0000-0000000000c1', 'A owner'),
  ('b2b2b2b2-0000-0000-0000-0000000000c2', 'B owner'),
  ('c3c3c3c3-0000-0000-0000-0000000000c3', 'B member');
insert into public.households (id, name) values
  ('aaaaaaaa-c1c1-0000-0000-000000000000', 'CNT HH A'),
  ('bbbbbbbb-c2c2-0000-0000-000000000000', 'CNT HH B');
insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-c1c1-0000-0000-000000000000', 'a1a1a1a1-0000-0000-0000-0000000000c1', 'owner'),
  ('bbbbbbbb-c2c2-0000-0000-000000000000', 'b2b2b2b2-0000-0000-0000-0000000000c2', 'owner'),
  ('bbbbbbbb-c2c2-0000-0000-000000000000', 'c3c3c3c3-0000-0000-0000-0000000000c3', 'member');

-- ── Shape / grants ───────────────────────────────────────────────────────────
select has_table('public', 'ai_call_counter', 'ai_call_counter exists');
select col_is_pk('public', 'ai_call_counter', ARRAY['household_id', 'day'],
  'ai_call_counter PK is (household_id, day)');
select has_function('public', 'reserve_ai_call', ARRAY['uuid', 'integer'],
  'reserve_ai_call(uuid, integer) exists');
select is((select relrowsecurity from pg_class where oid = 'public.ai_call_counter'::regclass),
  true, 'RLS enabled on ai_call_counter');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'ai_call_counter'
     and cmd in ('INSERT', 'UPDATE', 'DELETE')),
  0, 'ai_call_counter has no client write policy');
select is(has_function_privilege('service_role', 'public.reserve_ai_call(uuid,integer)', 'execute'),
  true, 'service_role can execute reserve_ai_call');
select is(has_function_privilege('authenticated', 'public.reserve_ai_call(uuid,integer)', 'execute'),
  false, 'authenticated cannot execute reserve_ai_call');

-- ── Functional: reserve counts up to the limit, then NULL ─────────────────────
select is(public.reserve_ai_call('aaaaaaaa-c1c1-0000-0000-000000000000', 3), 1,
  'reserve #1 for A (limit 3) returns 1');
select is(public.reserve_ai_call('aaaaaaaa-c1c1-0000-0000-000000000000', 3), 2,
  'reserve #2 for A returns 2');
select is(public.reserve_ai_call('aaaaaaaa-c1c1-0000-0000-000000000000', 3), 3,
  'reserve #3 for A returns 3');
select is(public.reserve_ai_call('aaaaaaaa-c1c1-0000-0000-000000000000', 3), null,
  'reserve #4 for A (at limit) returns NULL');

-- ── Zero limit → always NULL, no row created ─────────────────────────────────
select is(public.reserve_ai_call('bbbbbbbb-c2c2-0000-0000-000000000000', 0), null,
  'reserve for B with limit 0 returns NULL');
select is(
  (select count(*)::int from public.ai_call_counter
     where household_id = 'bbbbbbbb-c2c2-0000-0000-000000000000'
       and day = (now() at time zone 'utc')::date),
  0, 'no counter row created for B when limit is 0');

-- ── Day isolation: a past-day row does not affect today's count ──────────────
insert into public.ai_call_counter (household_id, day, n) values
  ('bbbbbbbb-c2c2-0000-0000-000000000000', (now() at time zone 'utc')::date - 1, 99);
select is(public.reserve_ai_call('bbbbbbbb-c2c2-0000-0000-000000000000', 3), 1,
  'reserve for B today returns 1 despite a prior-day n=99');
select is(
  (select n from public.ai_call_counter
     where household_id = 'bbbbbbbb-c2c2-0000-0000-000000000000'
       and day = (now() at time zone 'utc')::date - 1),
  99, 'the prior-day B counter row is untouched');

-- ── RLS: a household member reads only its own household's counter ───────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3c3c3c3-0000-0000-0000-0000000000c3","role":"authenticated"}';
select ok(
  (select count(*) from public.ai_call_counter
     where household_id = 'bbbbbbbb-c2c2-0000-0000-000000000000') >= 1,
  'B member can read its own household counter rows');
select is(
  (select count(*)::int from public.ai_call_counter
     where household_id = 'aaaaaaaa-c1c1-0000-0000-000000000000'),
  0, 'B member sees 0 counter rows of household A');
reset role;

select * from finish();
rollback;
