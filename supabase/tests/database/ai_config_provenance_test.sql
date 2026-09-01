-- pgTAP for intent 008 bolt 042: household_ai_config provenance trigger.
-- (unit 002-settings-ai-remediation; story 002-ai-config-write-provenance)
-- Run locally via: supabase test db
--
-- Households: A (owner a1, has a config row), B (owner b2 + member c3, has a config row),
--             C (owner c4, NO config row — for the INSERT path).

begin;
select plan(13);

set local app.provisioning_disabled = 'on';

-- ── Fixtures ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('a1a1a1a1-0000-0000-0000-0000000000d1', 'a-prov@example.test'),
  ('b2b2b2b2-0000-0000-0000-0000000000d2', 'b-prov@example.test'),
  ('c3c3c3c3-0000-0000-0000-0000000000d3', 'c-prov@example.test'),
  ('c4c4c4c4-0000-0000-0000-0000000000d4', 'd-prov@example.test');
insert into public.profiles (id, display_name) values
  ('a1a1a1a1-0000-0000-0000-0000000000d1', 'A owner'),
  ('b2b2b2b2-0000-0000-0000-0000000000d2', 'B owner'),
  ('c3c3c3c3-0000-0000-0000-0000000000d3', 'B member'),
  ('c4c4c4c4-0000-0000-0000-0000000000d4', 'C owner');
insert into public.households (id, name) values
  ('aaaaaaaa-d1d1-0000-0000-000000000000', 'PROV HH A'),
  ('bbbbbbbb-d2d2-0000-0000-000000000000', 'PROV HH B'),
  ('cccccccc-d4d4-0000-0000-000000000000', 'PROV HH C');
insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-d1d1-0000-0000-000000000000', 'a1a1a1a1-0000-0000-0000-0000000000d1', 'owner'),
  ('bbbbbbbb-d2d2-0000-0000-000000000000', 'b2b2b2b2-0000-0000-0000-0000000000d2', 'owner'),
  ('bbbbbbbb-d2d2-0000-0000-000000000000', 'c3c3c3c3-0000-0000-0000-0000000000d3', 'member'),
  ('cccccccc-d4d4-0000-0000-000000000000', 'c4c4c4c4-0000-0000-0000-0000000000d4', 'owner');

-- Seeded as superuser (RLS bypassed) with a deliberately stale updated_at / null updated_by.
insert into public.household_ai_config (household_id, daily_call_limit, updated_at, updated_by) values
  ('aaaaaaaa-d1d1-0000-0000-000000000000', 25, timestamptz '2000-01-01', null),
  ('bbbbbbbb-d2d2-0000-0000-000000000000', 10, timestamptz '2000-01-01', null);

-- ── Shape ────────────────────────────────────────────────────────────────────
select has_function('public', 'stamp_household_ai_config_provenance', 'trigger fn exists');
select is(
  (select count(*)::int from pg_trigger
     where tgname = 'trg_household_ai_config_provenance'
       and tgrelid = 'public.household_ai_config'::regclass),
  1, 'BEFORE INSERT OR UPDATE trigger is attached to household_ai_config');

-- ── Column privileges: authenticated cannot write updated_at / updated_by ─────
select is(has_column_privilege('authenticated', 'public.household_ai_config', 'updated_at', 'UPDATE'),
  false, 'authenticated cannot UPDATE updated_at');
select is(has_column_privilege('authenticated', 'public.household_ai_config', 'updated_by', 'UPDATE'),
  false, 'authenticated cannot UPDATE updated_by');
select is(has_column_privilege('authenticated', 'public.household_ai_config', 'updated_at', 'INSERT'),
  false, 'authenticated cannot INSERT updated_at');
select is(has_column_privilege('authenticated', 'public.household_ai_config', 'updated_by', 'INSERT'),
  false, 'authenticated cannot INSERT updated_by');
-- daily_call_limit / model_override are still writable
select is(has_column_privilege('authenticated', 'public.household_ai_config', 'daily_call_limit', 'UPDATE'),
  true, 'authenticated can still UPDATE daily_call_limit');

-- ── UPDATE path: trigger stamps both columns from the server ─────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"b2b2b2b2-0000-0000-0000-0000000000d2","role":"authenticated"}';

select lives_ok(
  $$ update public.household_ai_config set daily_call_limit = 7
     where household_id = 'bbbbbbbb-d2d2-0000-0000-000000000000' $$,
  'B owner updates daily_call_limit (no provenance columns in the statement)');

select throws_ok(
  $$ update public.household_ai_config set updated_at = timestamptz '2000-06-01'
     where household_id = 'bbbbbbbb-d2d2-0000-0000-000000000000' $$,
  '42501', null, 'B owner cannot name updated_at in an UPDATE (column revoked)');

-- ── INSERT path (auto-create for a household with no row) ───────────────────
set local request.jwt.claims = '{"sub":"c4c4c4c4-0000-0000-0000-0000000000d4","role":"authenticated"}';
select lives_ok(
  $$ insert into public.household_ai_config (household_id, daily_call_limit)
     values ('cccccccc-d4d4-0000-0000-000000000000', 15) $$,
  'C owner inserts a fresh config row');

reset role;

select is(
  (select updated_by from public.household_ai_config
     where household_id = 'bbbbbbbb-d2d2-0000-0000-000000000000'),
  'b2b2b2b2-0000-0000-0000-0000000000d2'::uuid,
  'UPDATE stamped updated_by = the acting owner');
select ok(
  (select updated_at from public.household_ai_config
     where household_id = 'bbbbbbbb-d2d2-0000-0000-000000000000') > now() - interval '10 seconds',
  'UPDATE stamped a fresh updated_at (not the seeded 2000-01-01)');
select is(
  (select updated_by from public.household_ai_config
     where household_id = 'cccccccc-d4d4-0000-0000-000000000000'),
  'c4c4c4c4-0000-0000-0000-0000000000d4'::uuid,
  'INSERT stamped updated_by = the acting owner');

select * from finish();
rollback;
