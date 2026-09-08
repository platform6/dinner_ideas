-- pgTAP tests for the weekly-planning schema (bolt 002-weekly-planning)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Mirrors the checks that were run directly against the live linked project
-- during Stage 4/5 (see ddd-03-test-report.md).

begin;
select plan(22);

-- account-model (intent 004): weekly_plans.household_id is NOT NULL (default
-- current_user_household_id()). Run as the founding household's owner (migration 20260828234000)
-- so plan inserts self-assign and the one-unlocked-per-household index behaves as before.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f0","role":"authenticated"}';

-- Schema shape
select has_table('public', 'weekly_plans', 'weekly_plans table exists');
select has_table('public', 'weekly_plan_selections', 'weekly_plan_selections table exists');
select has_column('public', 'weekly_plans', 'locked_at', 'weekly_plans has a locked_at column');

-- Fixture: one seed dinner to attach selections to (assumes seed data from 001-dinner-catalog is present)
select case when (select count(*) from public.dinners) >= 4
  then ok(true, 'at least 4 seed dinners available for fixtures')
  else ok(false, 'expected at least 4 seed dinners to exist for this test to run meaningfully')
end;

-- Selection-cap enforcement, at the DEFAULT dinners_per_week (3).
-- Intent 015 made the bound a household setting; these two still exercise the default, and the
-- non-default cases below are what actually prove the setting is read.
select throws_ok(
  $$
    with p as (insert into public.weekly_plans (start_date) values (current_date) returning id),
    d as (select id from public.dinners limit 4)
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id)
    select p.id, d.id from p, d
  $$,
  'P0001',
  null,
  'a 4th distinct-dinner selection is rejected at the default dinners_per_week of 3, by fn_weekly_plan_selections_guard (SQLSTATE P0001) — the unique constraint on (weekly_plan_id, dinner_id) is a separate guard that only fires on a duplicate dinner_id, not exercised by this test'
);

-- Exactly-N-to-lock enforcement, at the default (3).
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
  'locking a plan without exactly dinners_per_week selections is rejected (default 3)'
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

-- ── idx_weekly_plans_one_unlocked ────────────────────────────────────────────
-- At most one unlocked (draft) plan per household PER PLANNING WEEK.
--
-- Added by 20260827002830 after a code-review finding: two concurrent "no current plan" reads
-- could each create their own plan, silently orphaning one pick. Rescoped to the planning week by
-- intent 017 (bolt 067, ADR-11) after the household-wide version blocked creating a new week's
-- plan while an earlier draft was still unlocked — a production outage on 2026-09-08.
--
-- NOTE for future readers: the pre-017 version of this block inserted TWO plans at `current_date`
-- and asserted the second was rejected. That assertion holds under both the old and the new index,
-- so it never actually exercised the household-wide scope — which is why the suite stayed green
-- while production broke. The `different week is accepted` case below is the one that would have
-- caught it, and is the reason this block is now four assertions rather than one.

-- Each case below uses its OWN future week (+100, +200, +300). pgTAP runs the whole file in one
-- transaction, so plans created by one assertion are still present in the next; sharing
-- `current_date` made these order-dependent and (c) failed on (b)'s leftover draft. Distinct weeks
-- keep each assertion independent of the others and of any seed data.

-- (a) same household, SAME week → still rejected. This is bolt 027's protection, preserved.
select throws_ok(
  $$
    do $do$
    begin
      insert into public.weekly_plans (start_date) values (current_date + 100);
      -- must fail: a draft for this same week already exists
      insert into public.weekly_plans (start_date) values (current_date + 100);
    end;
    $do$;
  $$,
  '23505',
  null,
  'a second unlocked plan for the SAME week is rejected'
);

-- (b) same household, DIFFERENT week → accepted. THE REGRESSION TEST for the 2026-09-08 outage:
--     a stale draft from an earlier week must not block planning the current one.
select lives_ok(
  $$
    do $do$
    begin
      insert into public.weekly_plans (start_date) values (current_date + 200);
      insert into public.weekly_plans (start_date) values (current_date + 207);
    end;
    $do$;
  $$,
  'a draft for the current week is accepted while an older week''s draft is still unlocked'
);

-- (c) a week that already has a LOCKED plan may be re-planned. Production already contained such
--     a pair (week of 2026-08-30) and fetchPlanByStartDate resolves duplicates by newest, so the
--     index must not forbid this.
select lives_ok(
  $$
    do $do$
    begin
      insert into public.weekly_plans (start_date, locked_at)
        values (current_date + 300, now());
      insert into public.weekly_plans (start_date) values (current_date + 300);
    end;
    $do$;
  $$,
  'a draft is accepted for a week that already has a locked plan'
);

-- (d) the index definition itself, so a future edit cannot silently narrow or widen it.
select is(
  (select indexdef from pg_indexes where indexname = 'idx_weekly_plans_one_unlocked'),
  'CREATE UNIQUE INDEX idx_weekly_plans_one_unlocked ON public.weekly_plans USING btree (household_id, start_date) NULLS NOT DISTINCT WHERE (locked_at IS NULL)',
  'idx_weekly_plans_one_unlocked is scoped to (household_id, start_date), nulls not distinct'
);


-- ── intent 015: the cap and the lock follow households.dinners_per_week ──────
-- Each case sets its own dinners_per_week and restores it, because pgTAP runs the whole file in
-- ONE transaction: a setting left changed would silently alter every later assertion. (A
-- throws_ok block restores itself, since the failing statement rolls back its own update.)

-- (a) the column exists with the intended bounds and default
select is(
  (select column_default::text from information_schema.columns
    where table_schema='public' and table_name='households' and column_name='dinners_per_week'),
  '3'::text,
  'households.dinners_per_week defaults to 3, so the intent 015 deploy is a no-op for existing households'
);

select throws_ok(
  $$ update public.households set dinners_per_week = 8 $$,
  '23514', null,
  'dinners_per_week is rejected above 7 — a week has seven days'
);

select throws_ok(
  $$ update public.households set dinners_per_week = 0 $$,
  '23514', null,
  'dinners_per_week is rejected below 1'
);

-- (b) THE FEATURE: at a NON-DEFAULT setting the cap moves with it.
--     A suite that only ever exercises 3 has re-tested the old behaviour, not this change.
select lives_ok(
  $$
    do $do$
    declare v_plan uuid; v_d uuid[];
    begin
      update public.households set dinners_per_week = 5;
      select array_agg(id) into v_d from (select id from public.dinners limit 5) x;
      insert into public.weekly_plans (start_date) values (current_date + 400) returning id into v_plan;
      for i in 1..5 loop
        insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (v_plan, v_d[i]);
      end loop;
      update public.households set dinners_per_week = 3;
    end;
    $do$;
  $$,
  'five selections are accepted when dinners_per_week is 5'
);

select throws_ok(
  $$
    do $do$
    declare v_plan uuid; v_d uuid[];
    begin
      update public.households set dinners_per_week = 5;
      select array_agg(id) into v_d from (select id from public.dinners limit 6) x;
      insert into public.weekly_plans (start_date) values (current_date + 410) returning id into v_plan;
      for i in 1..6 loop
        insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (v_plan, v_d[i]);
      end loop;
    end;
    $do$;
  $$,
  'P0001', null,
  'a 6th selection is rejected when dinners_per_week is 5 — the cap follows the setting'
);

-- (c) locking requires exactly N, not exactly 3
select lives_ok(
  $$
    do $do$
    declare v_plan uuid; v_d uuid[]; v_rows int;
    begin
      update public.households set dinners_per_week = 5;
      select array_agg(id) into v_d from (select id from public.dinners limit 5) x;
      insert into public.weekly_plans (start_date) values (current_date + 420) returning id into v_plan;
      for i in 1..5 loop
        insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (v_plan, v_d[i]);
      end loop;
      perform public.lock_weekly_plan(v_plan);
      -- the meal-history trigger was always N-agnostic; prove it at a non-default N
      select count(*) into v_rows from public.meal_history where weekly_plan_id = v_plan;
      if v_rows != 5 then
        raise exception 'expected 5 meal_history rows at dinners_per_week=5, found %', v_rows;
      end if;
      update public.households set dinners_per_week = 3;
    end;
    $do$;
  $$,
  'a plan locks at exactly 5 when dinners_per_week is 5, and meal_history gets one row per selection'
);

-- (d) lowering the setting under an existing plan: nothing is deleted, but the plan cannot lock.
--     This is the "valid but unlockable" state the domain model describes. The refusal must say
--     how many picks to remove, not just report a count mismatch.
select throws_ok(
  $$
    do $do$
    declare v_plan uuid; v_d uuid[];
    begin
      update public.households set dinners_per_week = 5;
      select array_agg(id) into v_d from (select id from public.dinners limit 5) x;
      insert into public.weekly_plans (start_date) values (current_date + 430) returning id into v_plan;
      for i in 1..5 loop
        insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (v_plan, v_d[i]);
      end loop;
      update public.households set dinners_per_week = 3;   -- lowered under the plan
      if (select count(*) from public.weekly_plan_selections where weekly_plan_id = v_plan) != 5 then
        raise exception 'lowering the setting deleted selections — it must not';
      end if;
      perform public.lock_weekly_plan(v_plan);
    end;
    $do$;
  $$,
  'P0001', null,
  'lowering dinners_per_week keeps every pick but makes the plan unlockable until picks are removed'
);

-- NOTE: the ADR-12 search_path guard for these functions lives in advisor_hardening_test.sql,
-- which already asserts proconfig on all six hardened functions. Not duplicated here.

-- (f) the misnamed function is gone, not merely shadowed
select is_empty(
  $$ select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'fn_weekly_plans_require_three_on_lock' $$,
  'fn_weekly_plans_require_three_on_lock is dropped — its name asserted the constant intent 015 removed'
);

-- (g) the serialisation from 20260827002830 is still in the guard's body.
--     True multi-session concurrency cannot be exercised from a single pgTAP transaction, so this
--     is a SOURCE-LEVEL guard, not a race test — recorded as such rather than dressed up as one.
select matches(
  (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='fn_weekly_plan_selections_guard'),
  'for update',
  'the selection guard still takes `for update` on the plan row (the 20260827002830 race fix)'
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
