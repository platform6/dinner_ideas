-- pgTAP tests for the meal_history schema/trigger (bolt 010-weekly-planning)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- These assertions mirror the checks that were run directly against the live linked
-- "dinner ideas" project during Stage 5 (see ddd-03-test-report.md) via `supabase db query`,
-- wrapped in its own rolled-back transaction (including a transactional drop/restore of
-- idx_weekly_plans_one_unlocked, so it never collided with the real household plan). Kept
-- here as a durable, re-runnable regression suite for local/CI use.

begin;
select plan(9);

-- Schema shape
select has_table('public', 'meal_history', 'meal_history table exists');
select has_column('public', 'meal_history', 'weekly_plan_id', 'meal_history has a weekly_plan_id column');
select has_column('public', 'meal_history', 'dinner_id', 'meal_history has a dinner_id column');
select has_column('public', 'meal_history', 'week_start_date', 'meal_history has a week_start_date column');
select col_is_unique('public', 'meal_history', array['weekly_plan_id', 'dinner_id'], 'meal_history has a unique (weekly_plan_id, dinner_id)');

-- Trigger behavior: locking a plan (via the RPC) writes 3 meal_history rows.
-- Safe against a fresh local/CI database (no pre-existing unlocked plan to collide with
-- idx_weekly_plans_one_unlocked, unlike the live project — see ddd-03-test-report.md).
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
