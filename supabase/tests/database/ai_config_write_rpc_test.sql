-- pgTAP for intent 008 post-deploy fix: set_ai_model_override / set_ai_daily_call_limit.
-- (migration 20260901120000_ai_config_write_rpc.sql)
-- Run locally via: supabase test db
--
-- Households: A (owner a1, has a config row), B (owner b2 + member c3, has a config row),
--             C (owner c4, NO config row — INSERT path).

begin;
select plan(16);

set local app.provisioning_disabled = 'on';

-- ── Fixtures ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('a1a1a1a1-0000-0000-0000-0000000000e1', 'a-rpc@example.test'),
  ('b2b2b2b2-0000-0000-0000-0000000000e2', 'b-rpc@example.test'),
  ('c3c3c3c3-0000-0000-0000-0000000000e3', 'c-rpc@example.test'),
  ('c4c4c4c4-0000-0000-0000-0000000000e4', 'd-rpc@example.test');
insert into public.profiles (id, display_name) values
  ('a1a1a1a1-0000-0000-0000-0000000000e1', 'A owner'),
  ('b2b2b2b2-0000-0000-0000-0000000000e2', 'B owner'),
  ('c3c3c3c3-0000-0000-0000-0000000000e3', 'B member'),
  ('c4c4c4c4-0000-0000-0000-0000000000e4', 'C owner');
insert into public.households (id, name) values
  ('aaaaaaaa-e1e1-0000-0000-000000000000', 'RPC HH A'),
  ('bbbbbbbb-e2e2-0000-0000-000000000000', 'RPC HH B'),
  ('cccccccc-e4e4-0000-0000-000000000000', 'RPC HH C');
insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-e1e1-0000-0000-000000000000', 'a1a1a1a1-0000-0000-0000-0000000000e1', 'owner'),
  ('bbbbbbbb-e2e2-0000-0000-000000000000', 'b2b2b2b2-0000-0000-0000-0000000000e2', 'owner'),
  ('bbbbbbbb-e2e2-0000-0000-000000000000', 'c3c3c3c3-0000-0000-0000-0000000000e3', 'member'),
  ('cccccccc-e4e4-0000-0000-000000000000', 'c4c4c4c4-0000-0000-0000-0000000000e4', 'owner');
insert into public.household_ai_config (household_id, model_override, daily_call_limit) values
  ('aaaaaaaa-e1e1-0000-0000-000000000000', null, 25),
  ('bbbbbbbb-e2e2-0000-0000-000000000000', 'claude-haiku-4-5', 10);

-- ── Shape / grants ───────────────────────────────────────────────────────────
select has_function('public', 'set_ai_model_override', ARRAY['text'],
  'set_ai_model_override(text) exists');
select has_function('public', 'set_ai_daily_call_limit', ARRAY['integer'],
  'set_ai_daily_call_limit(integer) exists');
select is(has_function_privilege('authenticated', 'public.set_ai_model_override(text)', 'execute'),
  true, 'authenticated can execute set_ai_model_override');
select is(has_function_privilege('authenticated', 'public.set_ai_daily_call_limit(integer)', 'execute'),
  true, 'authenticated can execute set_ai_daily_call_limit');
select is(has_function_privilege('anon', 'public.set_ai_model_override(text)', 'execute'),
  false, 'anon cannot execute set_ai_model_override');

-- ── Owner path: act as b2 ───────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"b2b2b2b2-0000-0000-0000-0000000000e2","role":"authenticated"}';

select lives_ok(
  $$ select public.set_ai_model_override('claude-opus-5') $$,
  'B owner sets model_override');
select lives_ok(
  $$ select public.set_ai_model_override(null) $$,
  'B owner clears model_override (null = server default)');
select throws_ok(
  $$ select public.set_ai_model_override('gpt-4') $$,
  '22023', null, 'set_ai_model_override rejects a non-allowlisted model');
select lives_ok(
  $$ select public.set_ai_daily_call_limit(9) $$,
  'B owner sets daily_call_limit');
select throws_ok(
  $$ select public.set_ai_daily_call_limit(-1) $$,
  '22023', null, 'set_ai_daily_call_limit rejects a negative value');

-- ── Non-owner member: act as c3 (member of B) ──────────────────────────────
set local request.jwt.claims = '{"sub":"c3c3c3c3-0000-0000-0000-0000000000e3","role":"authenticated"}';
select throws_ok(
  $$ select public.set_ai_model_override('claude-opus-5') $$,
  '42501', null, 'B non-owner member cannot set_ai_model_override');
select throws_ok(
  $$ select public.set_ai_daily_call_limit(5) $$,
  '42501', null, 'B non-owner member cannot set_ai_daily_call_limit');

-- ── INSERT path: act as c4 (owner of C, no config row yet) ─────────────────
set local request.jwt.claims = '{"sub":"c4c4c4c4-0000-0000-0000-0000000000e4","role":"authenticated"}';
select lives_ok(
  $$ select public.set_ai_model_override('claude-haiku-4-5') $$,
  'C owner sets model_override on a household with no config row (INSERT path)');

reset role;

select is(
  (select daily_call_limit from public.household_ai_config
     where household_id = 'bbbbbbbb-e2e2-0000-0000-000000000000'),
  9, 'B daily_call_limit persisted');
select is(
  (select updated_by from public.household_ai_config
     where household_id = 'bbbbbbbb-e2e2-0000-0000-000000000000'),
  'b2b2b2b2-0000-0000-0000-0000000000e2'::uuid,
  'the RPC write stamped updated_by = the acting owner (via the provenance trigger)');
select is(
  (select model_override from public.household_ai_config
     where household_id = 'cccccccc-e4e4-0000-0000-000000000000'),
  'claude-haiku-4-5', 'INSERT path created C''s config row with the model');

select * from finish();
rollback;
