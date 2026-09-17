-- pgTAP tests for fn_remove_dinner / fn_dinner_removal_impact and the selections-guard escape
-- (intent 018-serving-scale-and-removal, unit 003-remove-a-dinner, bolt 072)
-- Stories: 001-remove-a-dinner, 002-confirm-before-removing, 003-removal-tests
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- The mirror of create_dinner_rpc_test.sql: that proved the aggregate goes in whole; this proves it
-- goes out whole, takes exactly what ADR-15 says and nothing more, and refuses the one case it must.
--
-- Fixtures build REAL history the way the app does: a plan is locked by updating locked_at, and the
-- lock trigger writes meal_history. Household A plans one dinner a week, so a plan locks with one
-- selection and each dinner below sits in exactly the situation its test needs:
--
--   D1 never planned                     — the common case (the bark)
--   D2 in a PAST locked plan, cooked     — its history must go
--   D3 in THIS WEEK's draft plan         — must be taken off the plan
--   D4 in THIS WEEK's locked plan        — must be REFUSED, and nothing may change
--   D5 in an older past locked plan      — left alone; used to prove the guard escape is narrow
--   DB household B's dinner              — isolation

begin;
select plan(30);

set local app.provisioning_disabled = 'on';

-- ── Fixtures ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('0d000000-0000-4000-8000-000000000001', 'remover-a@remove.test'),
  ('0d000000-0000-4000-8000-000000000002', 'remover-b@remove.test');
insert into public.profiles (id, display_name) values
  ('0d000000-0000-4000-8000-000000000001', 'A'),
  ('0d000000-0000-4000-8000-000000000002', 'B');
insert into public.households (id, name, dinners_per_week) values
  ('0c000000-0000-4000-8000-00000000000a', 'Remove A', 1),
  ('0c000000-0000-4000-8000-00000000000b', 'Remove B', 1);
insert into public.household_members (household_id, profile_id, role) values
  ('0c000000-0000-4000-8000-00000000000a', '0d000000-0000-4000-8000-000000000001', 'owner'),
  ('0c000000-0000-4000-8000-00000000000b', '0d000000-0000-4000-8000-000000000002', 'owner');

insert into public.dinners (id, household_id, name, cuisine_type, cook_time_minutes, instructions) values
  ('1e000000-0000-4000-8000-000000000001', '0c000000-0000-4000-8000-00000000000a', 'Never Planned', 'Test', 10, 'x'),
  ('1e000000-0000-4000-8000-000000000002', '0c000000-0000-4000-8000-00000000000a', 'Cooked Before', 'Test', 10, 'x'),
  ('1e000000-0000-4000-8000-000000000003', '0c000000-0000-4000-8000-00000000000a', 'In This Draft', 'Test', 10, 'x'),
  ('1e000000-0000-4000-8000-000000000004', '0c000000-0000-4000-8000-00000000000a', 'In This Locked', 'Test', 10, 'x'),
  ('1e000000-0000-4000-8000-000000000005', '0c000000-0000-4000-8000-00000000000a', 'Older Past', 'Test', 10, 'x'),
  ('1e000000-0000-4000-8000-00000000000b', '0c000000-0000-4000-8000-00000000000b', 'B Dinner', 'Test', 10, 'x');

-- D1's aggregate: ingredients (which also register Items via the sync trigger), a step, a tag link.
insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category) values
  ('1e000000-0000-4000-8000-000000000001', 'Removal Test Flour', 1, 'cup', 'Pantry'),
  ('1e000000-0000-4000-8000-000000000001', 'Removal Test Butter', 0.5, 'cup', 'Dairy');
insert into public.dinner_steps (dinner_id, step_number, instruction) values
  ('1e000000-0000-4000-8000-000000000001', 1, 'Mix.');
insert into public.tags (id, household_id, name) values
  ('3a000000-0000-4000-8000-000000000001', '0c000000-0000-4000-8000-00000000000a', 'removal-test-keepme');
insert into public.dinner_tags (dinner_id, tag_id) values
  ('1e000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000001');

-- Plans: two past (week ended), one current draft, one current locked.
insert into public.weekly_plans (id, household_id, start_date) values
  ('2f000000-0000-4000-8000-000000000002', '0c000000-0000-4000-8000-00000000000a', current_date - 14),
  ('2f000000-0000-4000-8000-000000000003', '0c000000-0000-4000-8000-00000000000a', current_date - 2),
  ('2f000000-0000-4000-8000-000000000004', '0c000000-0000-4000-8000-00000000000a', current_date - 3),
  ('2f000000-0000-4000-8000-000000000005', '0c000000-0000-4000-8000-00000000000a', current_date - 21);
insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values
  ('2f000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002'),
  ('2f000000-0000-4000-8000-000000000003', '1e000000-0000-4000-8000-000000000003'),
  ('2f000000-0000-4000-8000-000000000004', '1e000000-0000-4000-8000-000000000004'),
  ('2f000000-0000-4000-8000-000000000005', '1e000000-0000-4000-8000-000000000005');
-- Lock three of them; the lock trigger writes meal_history, exactly as in the app.
update public.weekly_plans set locked_at = now()
 where id in ('2f000000-0000-4000-8000-000000000002',
              '2f000000-0000-4000-8000-000000000004',
              '2f000000-0000-4000-8000-000000000005');

-- Every call below runs as household A's user unless stated.
set local request.jwt.claims = '{"sub":"0d000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

-- ── The impact function reports each situation correctly ─────────────────────
select is(public.fn_dinner_removal_impact('1e000000-0000-4000-8000-000000000001'),
  '{"history_count":0,"past_plan_count":0,"in_current_draft":false,"in_current_locked_plan":false}'::jsonb,
  'impact: a never-planned dinner takes nothing but itself');
select is(public.fn_dinner_removal_impact('1e000000-0000-4000-8000-000000000002'),
  '{"history_count":1,"past_plan_count":1,"in_current_draft":false,"in_current_locked_plan":false}'::jsonb,
  'impact: a dinner cooked in a past week reports its history and past plan');
select is(public.fn_dinner_removal_impact('1e000000-0000-4000-8000-000000000003'),
  '{"history_count":0,"past_plan_count":0,"in_current_draft":true,"in_current_locked_plan":false}'::jsonb,
  'impact: a dinner in this week''s draft says so');
select is(public.fn_dinner_removal_impact('1e000000-0000-4000-8000-000000000004'),
  '{"history_count":1,"past_plan_count":0,"in_current_draft":false,"in_current_locked_plan":true}'::jsonb,
  'impact: a dinner in this week''s locked plan says so');

-- ── The one refusal: this week's locked plan, and NOTHING changes ────────────
select throws_ok(
  $$ select public.fn_remove_dinner('1e000000-0000-4000-8000-000000000004') $$,
  'P0001', 'in_current_locked_plan',
  'removing a dinner in this week''s locked plan is refused (ADR-15)'
);
reset role;
select is((select count(*)::int from public.dinners where id = '1e000000-0000-4000-8000-000000000004'), 1,
  'refused: the dinner is still there');
select is((select count(*)::int from public.weekly_plan_selections where dinner_id = '1e000000-0000-4000-8000-000000000004'), 1,
  'refused: the locked plan still holds it — a locked plan never loses a dinner mid-week');
select is((select count(*)::int from public.meal_history where dinner_id = '1e000000-0000-4000-8000-000000000004'), 1,
  'refused: its history is untouched');

-- ── A never-planned dinner goes whole; the shared vocabulary and the registry stay ──
set local role authenticated;
select lives_ok($$ select public.fn_remove_dinner('1e000000-0000-4000-8000-000000000001') $$,
  'a never-planned dinner can be removed');
reset role;
select is((select count(*)::int from public.dinners where id = '1e000000-0000-4000-8000-000000000001'), 0,
  'the dinner row is gone');
select is((select count(*)::int from public.dinner_ingredients where dinner_id = '1e000000-0000-4000-8000-000000000001'), 0,
  'its ingredient lines are gone — no orphans');
select is((select count(*)::int from public.dinner_steps where dinner_id = '1e000000-0000-4000-8000-000000000001'), 0,
  'its steps are gone — no orphans');
select is((select count(*)::int from public.dinner_tags where dinner_id = '1e000000-0000-4000-8000-000000000001'), 0,
  'its tag links are gone — no orphans');
select is((select count(*)::int from public.tags where id = '3a000000-0000-4000-8000-000000000001'), 1,
  'the TAG survives — the household vocabulary is shared, only the link goes');
select is((select count(*)::int from public.items
            where household_id = '0c000000-0000-4000-8000-00000000000a' and name in ('Removal Test Flour', 'Removal Test Butter')), 2,
  'the ITEMS survive — the registry is store knowledge, not dinner data (ADR-7)');

-- ── The name is free again, so a corrected recipe can come back under it ─────
select lives_ok(
  $$ insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
     values ('0c000000-0000-4000-8000-00000000000a', 'Never Planned', 'Test', 10, 'x') $$,
  'the removed dinner''s name can be reused'
);

-- ── A dinner cooked in a past week goes, and takes its history (ADR-15) ──────
set local role authenticated;
select lives_ok($$ select public.fn_remove_dinner('1e000000-0000-4000-8000-000000000002') $$,
  'a dinner with past history can be removed — warn and proceed, not refuse');
reset role;
select is((select count(*)::int from public.meal_history where dinner_id = '1e000000-0000-4000-8000-000000000002'), 0,
  'its meal history went with it');
select is((select count(*)::int from public.weekly_plan_selections where dinner_id = '1e000000-0000-4000-8000-000000000002'), 0,
  'its past-plan selection went with it — through the guard''s narrow escape');
select is((select count(*)::int from public.weekly_plans where id = '2f000000-0000-4000-8000-000000000002'), 1,
  'the past PLAN itself remains — only this dinner''s place in it went');

-- ── A dinner in this week's draft is taken off the plan ──────────────────────
set local role authenticated;
select lives_ok($$ select public.fn_remove_dinner('1e000000-0000-4000-8000-000000000003') $$,
  'a dinner in this week''s draft can be removed');
reset role;
select is((select count(*)::int from public.weekly_plan_selections where dinner_id = '1e000000-0000-4000-8000-000000000003'), 0,
  'it is off the draft plan');
select is((select count(*)::int from public.weekly_plans where id = '2f000000-0000-4000-8000-000000000003'), 1,
  'the draft plan itself remains');

-- ── Isolation: household B can neither remove nor measure A's dinner ─────────
set local request.jwt.claims = '{"sub":"0d000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;
select throws_ok($$ select public.fn_remove_dinner('1e000000-0000-4000-8000-000000000005') $$,
  'P0002', 'dinner not found',
  'another household''s dinner is "not found" — indistinguishable from one that does not exist');
select throws_ok($$ select public.fn_dinner_removal_impact('1e000000-0000-4000-8000-000000000005') $$,
  'P0002', 'dinner not found',
  'another household cannot even measure what removal would take');
reset role;
select is((select count(*)::int from public.dinners where id = '1e000000-0000-4000-8000-000000000005'), 1,
  'and A''s dinner is untouched');

-- ── The guard's escape is as narrow as designed ──────────────────────────────
select throws_ok(
  $$ delete from public.weekly_plan_selections where dinner_id = '1e000000-0000-4000-8000-000000000005' $$,
  'P0001', null,
  'without the removal flag, a past locked plan''s selection still cannot be deleted'
);
select set_config('app.dinner_removal', 'on', true);
select throws_ok(
  $$ delete from public.weekly_plan_selections where dinner_id = '1e000000-0000-4000-8000-000000000004' $$,
  'P0001', null,
  'even WITH the flag, this week''s locked plan cannot lose a selection — the week has not ended'
);
select throws_ok(
  $$ insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
     values ('2f000000-0000-4000-8000-000000000005', '1e000000-0000-4000-8000-000000000004') $$,
  'P0001', null,
  'even WITH the flag, nothing can be ADDED to a locked plan — only deletes are ever excused'
);
select set_config('app.dinner_removal', '', true);

-- ── The foreign keys are unchanged: no other path can do what fn_remove_dinner does ──
select throws_ok(
  $$ delete from public.dinners where id = '1e000000-0000-4000-8000-000000000005' $$,
  '23503', null,
  'a stray delete of a dinner with history still fails — the FKs did not become cascades (ADR-15)'
);

select * from finish();
rollback;
