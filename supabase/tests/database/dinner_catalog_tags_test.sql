-- pgTAP tests for the tags/dinner_tags schema (bolt 009-dinner-catalog)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Updated for intent 004-account-model: tags.household_id is NOT NULL (default
-- current_user_household_id()), and tags is now unique per household on (household_id, name).
-- A founding-owner JWT is set so inserts self-assign and RLS applies.

begin;
select plan(10);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f0","role":"authenticated"}';

-- Schema shape
select has_table('public', 'tags', 'tags table exists');
select has_table('public', 'dinner_tags', 'dinner_tags table exists');
select hasnt_column('public', 'dinners', 'rosie_approved', 'dinners.rosie_approved has been dropped');
select col_is_unique('public', 'tags', array['household_id', 'name'],
  'tags is unique per household on (household_id, name)');

-- Constraints
select throws_ok(
  $$ insert into public.tags (name) values ('Kid-Friendly') $$,
  '23514',
  null,
  'rejects a non-lowercase tag name'
);

select lives_ok(
  $$ insert into public.tags (name) values ('kid-friendly') $$,
  'accepts an already-lowercase tag name (household_id self-assigned)'
);

select throws_ok(
  $$
  do $do$
  declare v_d uuid; v_t uuid;
  begin
    select id into v_d from public.dinners limit 1;
    select id into v_t from public.tags where name = 'kid-friendly' limit 1;
    insert into public.dinner_tags (dinner_id, tag_id) values (v_d, v_t);
    insert into public.dinner_tags (dinner_id, tag_id) values (v_d, v_t);
  end;
  $do$;
  $$,
  '23505',
  null,
  'rejects duplicate (dinner_id, tag_id)'
);

-- Row Level Security
set local role anon;
select is_empty(
  $$ select 1 from public.tags $$,
  'anon role cannot read tags (RLS)'
);
reset role;

set local role authenticated;
select isnt_empty(
  $$ select 1 from public.tags $$,
  'authenticated role can read its household''s tags (RLS) — the kid-friendly tag added above'
);
reset role;

-- No dinner_tags rows persist (the dup-check DO block above rolled back on its second insert).
select is(
  (select count(*) from public.dinner_tags)::int,
  0,
  'no dinner starts pre-tagged — dinner_tags is empty'
);

select * from finish();
rollback;
