-- pgTAP for intent 007 bolt 037: household_ai_config, ai_usage_log, and the Vault key functions.
-- (unit 001-claude-proxy-service; stories 001, 002)
-- Run locally via: supabase test db
--
-- Seeds two households (A, B). B has an owner (b2) and a non-owner member (c3).

begin;
select plan(36);

set local app.provisioning_disabled = 'on';

-- ── Fixtures ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a-ai@example.test'),
  ('b2b2b2b2-0000-0000-0000-000000000002', 'b-ai@example.test'),
  ('c3c3c3c3-0000-0000-0000-000000000003', 'c-ai@example.test');
insert into public.profiles (id, display_name) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'A owner'),
  ('b2b2b2b2-0000-0000-0000-000000000002', 'B owner'),
  ('c3c3c3c3-0000-0000-0000-000000000003', 'B member');
insert into public.households (id, name) values
  ('aaaaaaaa-a1a1-0000-0000-000000000000', 'AI HH A'),
  ('bbbbbbbb-b2b2-0000-0000-000000000000', 'AI HH B');
insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-a1a1-0000-0000-000000000000', 'a1a1a1a1-0000-0000-0000-000000000001', 'owner'),
  ('bbbbbbbb-b2b2-0000-0000-000000000000', 'b2b2b2b2-0000-0000-0000-000000000002', 'owner'),
  ('bbbbbbbb-b2b2-0000-0000-000000000000', 'c3c3c3c3-0000-0000-0000-000000000003', 'member');

-- A pre-existing usage row + config row for each household (seeded as superuser, RLS bypassed).
insert into public.household_ai_config (household_id, model_override, daily_call_limit) values
  ('aaaaaaaa-a1a1-0000-0000-000000000000', null, 25),
  ('bbbbbbbb-b2b2-0000-0000-000000000000', 'claude-haiku-4-5', 10);
insert into public.ai_usage_log (household_id, feature, model, ok) values
  ('aaaaaaaa-a1a1-0000-0000-000000000000', 'connection_test', 'claude-sonnet-5', true),
  ('bbbbbbbb-b2b2-0000-0000-000000000000', 'connection_test', 'claude-haiku-4-5', true);

-- ── Shape ────────────────────────────────────────────────────────────────────
select has_table('public', 'household_ai_config', 'household_ai_config exists');
select has_table('public', 'ai_usage_log', 'ai_usage_log exists');
select col_is_pk('public', 'household_ai_config', 'household_id',
  'household_ai_config PK is household_id');
select col_is_pk('public', 'ai_usage_log', 'id', 'ai_usage_log PK is id');
select has_column('public', 'household_ai_config', 'key_secret_id', 'has key_secret_id');
select is(
  (select count(*)::int from pg_indexes
   where schemaname='public' and indexname='idx_ai_usage_log_household_created'),
  1, 'ai_usage_log (household_id, created_at) index exists');

-- ── Constraints ──────────────────────────────────────────────────────────────
select throws_ok(
  $$ insert into public.household_ai_config (household_id, model_override)
     values ('aaaaaaaa-a1a1-0000-0000-000000000000', 'gpt-4') $$,
  '23514', null, 'model_override rejects a non-allowlisted model');
select lives_ok(
  $$ update public.household_ai_config set model_override = 'claude-opus-5'
     where household_id = 'aaaaaaaa-a1a1-0000-0000-000000000000' $$,
  'model_override accepts an allowlisted model');
select lives_ok(
  $$ update public.household_ai_config set model_override = null
     where household_id = 'aaaaaaaa-a1a1-0000-0000-000000000000' $$,
  'model_override accepts null');
select throws_ok(
  $$ update public.household_ai_config set daily_call_limit = -1
     where household_id = 'aaaaaaaa-a1a1-0000-0000-000000000000' $$,
  '23514', null, 'daily_call_limit rejects a negative value');

-- ── RLS enabled + no write policies where there should be none ────────────────
select is((select relrowsecurity from pg_class where oid='public.household_ai_config'::regclass),
  true, 'RLS enabled on household_ai_config');
select is((select relrowsecurity from pg_class where oid='public.ai_usage_log'::regclass),
  true, 'RLS enabled on ai_usage_log');
select is(
  (select count(*)::int from pg_policies where schemaname='public' and tablename='ai_usage_log'
     and cmd in ('INSERT','UPDATE','DELETE')),
  0, 'ai_usage_log has no client write policy');
select is(
  (select count(*)::int from pg_policies where schemaname='public' and tablename='household_ai_config'
     and cmd = 'DELETE'),
  0, 'household_ai_config has no DELETE policy');

-- ── Column privilege: key_secret_id not client-writable ──────────────────────
select is(has_column_privilege('authenticated','public.household_ai_config','key_secret_id','UPDATE'),
  false, 'authenticated cannot UPDATE key_secret_id');
select is(has_column_privilege('authenticated','public.household_ai_config','key_secret_id','INSERT'),
  false, 'authenticated cannot INSERT key_secret_id');

-- ── Function grants ─────────────────────────────────────────────────────────
select is(has_function_privilege('service_role','public.resolve_ai_key(uuid)','execute'),
  true, 'service_role can execute resolve_ai_key');
select is(has_function_privilege('authenticated','public.resolve_ai_key(uuid)','execute'),
  false, 'authenticated cannot execute resolve_ai_key');
select is(has_function_privilege('authenticated','public.set_household_ai_key(text)','execute'),
  true, 'authenticated can execute set_household_ai_key');

-- ── RLS isolation: act as c3 (member of B) ──────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3c3c3c3-0000-0000-0000-000000000003","role":"authenticated"}';

select is(
  (select count(*)::int from public.household_ai_config
     where household_id = 'aaaaaaaa-a1a1-0000-0000-000000000000'),
  0, 'B member sees 0 rows of household A ai config');
select is(
  (select count(*)::int from public.ai_usage_log
     where household_id = 'aaaaaaaa-a1a1-0000-0000-000000000000'),
  0, 'B member sees 0 rows of household A usage log');
select is(
  (select count(*)::int from public.household_ai_config
     where household_id = 'bbbbbbbb-b2b2-0000-0000-000000000000'),
  1, 'B member CAN read its own household ai config');

-- non-owner update is silently RLS-filtered (no error, 0 rows changed); verified below after reset
select lives_ok(
  $$ update public.household_ai_config set daily_call_limit = 99
     where household_id = 'bbbbbbbb-b2b2-0000-0000-000000000000' $$,
  'B non-owner member UPDATE runs (RLS filters it to 0 rows, no error)');
select throws_ok(
  $$ select public.set_household_ai_key('sk-ant-nope') $$,
  '42501', null, 'B non-owner member cannot set_household_ai_key');

-- ── Owner path: act as b2 (owner of B) ─────────────────────────────────────
set local request.jwt.claims = '{"sub":"b2b2b2b2-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$ select public.set_household_ai_key('   ') $$,
  '22023', null, 'set_household_ai_key rejects an empty/blank key');
select lives_ok(
  $$ select public.set_household_ai_key('sk-ant-test-b-0001') $$,
  'B owner sets the household key');

reset role;
select is(
  (select daily_call_limit from public.household_ai_config
     where household_id = 'bbbbbbbb-b2b2-0000-0000-000000000000'),
  10, 'B non-owner UPDATE changed nothing (daily_call_limit still 10)');
select isnt(
  (select key_secret_id from public.household_ai_config
     where household_id = 'bbbbbbbb-b2b2-0000-0000-000000000000'),
  null, 'household B key_secret_id is set after set_household_ai_key');
select is(
  (select count(*)::int from vault.secrets where name = 'ai_key:bbbbbbbb-b2b2-0000-0000-000000000000'),
  1, 'a Vault secret named ai_key:{household B} exists');
select is(
  public.resolve_ai_key('bbbbbbbb-b2b2-0000-0000-000000000000'),
  'sk-ant-test-b-0001', 'resolve_ai_key returns the decrypted household B key');
select is(
  public.resolve_ai_key('aaaaaaaa-a1a1-0000-0000-000000000000'),
  null, 'resolve_ai_key returns null for a household with no key set');

-- ── Clear path ────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"b2b2b2b2-0000-0000-0000-000000000002","role":"authenticated"}';
select lives_ok($$ select public.clear_household_ai_key() $$, 'B owner clears the household key');
select lives_ok($$ select public.clear_household_ai_key() $$, 'clear_household_ai_key is a no-op when none set');
reset role;

select is(
  (select key_secret_id from public.household_ai_config
     where household_id = 'bbbbbbbb-b2b2-0000-0000-000000000000'),
  null, 'key_secret_id is null after clear');
select is(
  (select count(*)::int from vault.secrets where name = 'ai_key:bbbbbbbb-b2b2-0000-0000-000000000000'),
  0, 'the Vault secret is gone after clear');
select is(
  public.resolve_ai_key('bbbbbbbb-b2b2-0000-0000-000000000000'),
  null, 'resolve_ai_key returns null after clear');

select * from finish();
rollback;
