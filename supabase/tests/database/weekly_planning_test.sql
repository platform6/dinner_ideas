-- pgTAP tests for the weekly-planning schema (bolt 002-weekly-planning)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Mirrors the checks that were run directly against the live linked project
-- during Stage 4/5 (see ddd-03-test-report.md).

begin;
select plan(13);

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
