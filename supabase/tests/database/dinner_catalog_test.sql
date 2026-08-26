-- pgTAP tests for the dinner-catalog schema (bolt 001-dinner-catalog)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- These assertions mirror the checks that were run directly against the
-- live linked project during Stage 5 (see ddd-03-test-report.md) — kept
-- here as a durable, re-runnable regression suite for local/CI use.

begin;
select plan(9);

-- Schema shape
select has_table('public', 'dinners', 'dinners table exists');
select has_table('public', 'dinner_ingredients', 'dinner_ingredients table exists');
select has_column('public', 'dinners', 'is_active', 'dinners has an is_active column');

-- Constraints
select throws_ok(
  $$ insert into public.dinners (name, cuisine_type, cook_time_minutes, instructions)
     values ('pgTAP Test: Bad Cook Time', 'Test', 0, 'x') $$,
  '23514',
  null,
  'rejects cook_time_minutes <= 0'
);

select throws_ok(
  $$ insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category)
     select id, 'x', 0, 'cup', 'Produce' from public.dinners limit 1 $$,
  '23514',
  null,
  'rejects ingredient quantity <= 0'
);

select throws_ok(
  $$ insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category)
     select id, 'x', 1, 'cup', 'NotACategory' from public.dinners limit 1 $$,
  '23514',
  null,
  'rejects invalid grocery category'
);

select throws_ok(
  $$ insert into public.dinners (name, cuisine_type, cook_time_minutes, instructions)
     select name, cuisine_type, cook_time_minutes, instructions from public.dinners limit 1 $$,
  '23505',
  null,
  'rejects duplicate dinner name'
);

-- Row Level Security
set local role anon;
select is_empty(
  $$ select 1 from public.dinners $$,
  'anon role cannot read dinners (RLS)'
);
reset role;

set local role authenticated;
select isnt_empty(
  $$ select 1 from public.dinners $$,
  'authenticated role can read dinners (RLS)'
);
reset role;

select * from finish();
rollback;
