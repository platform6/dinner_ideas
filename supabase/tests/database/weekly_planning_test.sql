-- pgTAP tests for the weekly-planning schema (bolt 002-weekly-planning)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Mirrors the checks that were run directly against the live linked project
-- during Stage 4/5 (see ddd-03-test-report.md).

begin;
select plan(10);

-- Schema shape
select has_table('public', 'weekly_plans', 'weekly_plans table exists');
select has_table('public', 'weekly_plan_selections', 'weekly_plan_selections table exists');
select has_column('public', 'weekly_plans', 'locked_at', 'weekly_plans has a locked_at column');

-- Fixture: one seed dinner to attach selections to (assumes seed data from 001-dinner-catalog is present)
select case when (select count(*) from public.dinners) >= 4
  then ok(true, 'at least 4 seed dinners available for fixtures')
  else ok(false, 'expected at least 4 seed dinners to exist for this test to run meaningfully')
end;

-- Max-3 enforcement
select throws_ok(
  $$
    with p as (insert into public.weekly_plans (start_date) values (current_date) returning id),
    d as (select id from public.dinners limit 4)
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
    select p.id, d.id from p, d
  $$,
  'P0001',
  null,
  'a 4th distinct-dinner selection for the same plan is rejected by fn_weekly_plan_selections_guard (the max-3 trigger, SQLSTATE P0001) — the unique constraint on (weekly_plan_id, dinner_id) is a separate guard that only fires on a duplicate dinner_id, not exercised by this test'
);

-- Exactly-3-to-lock enforcement
select throws_ok(
  $$
    with p as (insert into public.weekly_plans (start_date) values (current_date) returning id),
    d as (select id from public.dinners limit 1)
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
    select p.id, d.id from p, d
    returning (select lock_weekly_plan(weekly_plan_id))
  $$,
  'P0001',
  null,
  'locking a plan without exactly 3 selections is rejected'
);

-- Immutability after lock (built as a single DO block so we can create+lock+attempt-edit atomically)
select throws_ok(
  $$
    do $do$
    declare
      v_plan_id uuid;
      v_dinner_ids uuid[];
    begin
      insert into public.weekly_plans (start_date) values (current_date) returning id into v_plan_id;
      select array_agg(id) into v_dinner_ids from (select id from public.dinners limit 3) x;

      insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
      select v_plan_id, unnest(v_dinner_ids);

      perform public.lock_weekly_plan(v_plan_id);

      -- this must fail: plan is now locked
      delete from public.weekly_plan_selections where weekly_plan_id = v_plan_id;
    end;
    $do$;
  $$,
  'P0001',
  null,
  'deleting a selection from a locked plan is rejected'
);

-- At most one unlocked (draft) plan may exist at a time (idx_weekly_plans_one_unlocked) —
-- added after a code-review finding: two concurrent "no current plan" reads could each
-- create their own plan, silently orphaning one pick. See 20260827002830_weekly_planning_concurrency_fixes.sql.
select throws_ok(
  $$
    do $do$
    begin
      insert into public.weekly_plans (start_date) values (current_date);
      -- this must fail: an unlocked plan already exists
      insert into public.weekly_plans (start_date) values (current_date);
    end;
    $do$;
  $$,
  '23505',
  null,
  'a second unlocked weekly plan is rejected while one already exists'
);

-- RLS
set local role anon;
select is_empty(
  $$ select 1 from public.weekly_plans $$,
  'anon role cannot read weekly_plans (RLS)'
);
reset role;

set local role authenticated;
select lives_ok(
  $$ select 1 from public.weekly_plans limit 0 $$,
  'authenticated role can query weekly_plans (RLS permits, even with 0 rows)'
);
reset role;

select * from finish();
rollback;
