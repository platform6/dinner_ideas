-- pgTAP tests for the dinner_steps schema (bolt 007-dinner-catalog)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- These assertions mirror the checks that were run directly against the
-- live linked project during Stage 5 (see ddd-03-test-report.md) — kept
-- here as a durable, re-runnable regression suite for local/CI use.

begin;
select plan(8);

-- Schema shape
select has_table('public', 'dinner_steps', 'dinner_steps table exists');
select has_column('public', 'dinner_steps', 'dinner_id', 'dinner_steps has a dinner_id column');
select has_column('public', 'dinner_steps', 'step_number', 'dinner_steps has a step_number column');
select has_column('public', 'dinner_steps', 'instruction', 'dinner_steps has an instruction column');

-- Constraints
select throws_ok(
  $$ insert into public.dinner_steps (dinner_id, step_number, instruction)
     select id, 0, 'x' from public.dinners limit 1 $$,
  '23514',
  null,
  'rejects step_number <= 0'
);

select throws_ok(
  $$ insert into public.dinner_steps (dinner_id, step_number, instruction)
     select dinner_id, step_number, 'dup' from public.dinner_steps limit 1 $$,
  '23505',
  null,
  'rejects duplicate (dinner_id, step_number)'
);

-- Row Level Security
set local role anon;
select is_empty(
  $$ select 1 from public.dinner_steps $$,
  'anon role cannot read dinner_steps (RLS)'
);
reset role;

set local role authenticated;
select isnt_empty(
  $$ select 1 from public.dinner_steps $$,
  'authenticated role can read dinner_steps (RLS)'
);
reset role;

select * from finish();
rollback;
