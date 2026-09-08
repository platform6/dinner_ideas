-- pgTAP tests for the meal_history schema/trigger (bolt 010-weekly-planning)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- These assertions mirror the checks that were run directly against the live linked
-- "dinner ideas" project during Stage 5 (see ddd-03-test-report.md) via `supabase db query`,
-- wrapped in its own rolled-back transaction. Kept here as a durable, re-runnable regression
-- suite for local/CI use.
--
-- HISTORICAL NOTE (intent 017, bolt 067): that live run also had to drop and restore
-- idx_weekly_plans_one_unlocked inside its transaction, because the real household held a draft
-- plan the household-wide index would have collided with. This file used to describe that as a
-- difference between CI and "the live project". It was not a fixture quirk — it was the
-- household-wide scope of that index announcing itself, a release cycle before it took production
-- down on 2026-09-08. The index is now scoped per planning week (ADR-11) and the workaround is no
-- longer needed. Recorded because the lesson generalises: when a test has to work around real
-- data, ask why production violates what CI assumes before writing the workaround.

begin;
select plan(9);

-- account-model (intent 004): weekly_plans / meal_history carry a NOT NULL household_id
-- (default current_user_household_id()). Run as the founding household's owner so the lock
-- trigger stamps meal_history.household_id from the parent plan.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f0","role":"authenticated"}';

-- Schema shape
select has_table('public', 'meal_history', 'meal_history table exists');
select has_column('public', 'meal_history', 'weekly_plan_id', 'meal_history has a weekly_plan_id column');
select has_column('public', 'meal_history', 'dinner_id', 'meal_history has a dinner_id column');
select has_column('public', 'meal_history', 'week_start_date', 'meal_history has a week_start_date column');
select col_is_unique('public', 'meal_history', array['weekly_plan_id', 'dinner_id'], 'meal_history has a unique (weekly_plan_id, dinner_id)');

-- Trigger behavior: locking a plan (via the RPC) writes 3 meal_history rows.
-- Since intent 017 the uniqueness index is scoped to (household_id, start_date), so this no longer
-- depends on there being no pre-existing draft — only on there being none for the same week.
--
-- Note the trigger's dedupe is `on conflict (weekly_plan_id, dinner_id)` — per PLAN, not per week.
-- Two plans for one week therefore contribute two sets of history for that week; production shows
-- exactly that for the week of 2026-08-30. Deliberately out of scope for bolt 067, which fixed the
-- uniqueness scope only.
select lives_ok(
  $$
  do $do$
  declare
    v_dinner_ids uuid[];
    v_plan uuid;
    v_count int;
  begin
    select array_agg(id) into v_dinner_ids from (select id from public.dinners limit 3) s;
    insert into public.weekly_plans (start_date) values ('2026-08-24') returning id into v_plan;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
      select v_plan, unnest(v_dinner_ids);
    perform public.lock_weekly_plan(v_plan);
    select count(*) into v_count from public.meal_history where weekly_plan_id = v_plan;
    if v_count != 3 then
      raise exception 'expected 3 meal_history rows after lock, got %', v_count;
    end if;
  end;
  $do$;
  $$,
  'locking a plan via the RPC writes exactly 3 meal_history rows'
);

-- ADR-002's scenario: locking via a direct UPDATE (not the RPC) must still fire the trigger.
select lives_ok(
  $$
  do $do$
  declare
    v_dinner_ids uuid[];
    v_plan uuid;
    v_count int;
  begin
    select array_agg(id) into v_dinner_ids from (select id from public.dinners limit 3) s;
    insert into public.weekly_plans (start_date) values ('2026-08-17') returning id into v_plan;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
      select v_plan, unnest(v_dinner_ids);
    update public.weekly_plans set locked_at = now() where id = v_plan;
    select count(*) into v_count from public.meal_history where weekly_plan_id = v_plan;
    if v_count != 3 then
      raise exception 'expected 3 meal_history rows after direct-UPDATE lock, got %', v_count;
    end if;
  end;
  $do$;
  $$,
  'locking a plan via a direct UPDATE (bypassing the RPC) still writes meal_history (ADR-002)'
);

-- Row Level Security
set local role anon;
select is_empty(
  $$ select 1 from public.meal_history $$,
  'anon role cannot read meal_history (RLS)'
);
reset role;

set local role authenticated;
select lives_ok(
  $$ select 1 from public.meal_history $$,
  'authenticated role can read meal_history (RLS)'
);
reset role;

select * from finish();
rollback;
