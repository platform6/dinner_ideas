-- pgTAP tests for the tags/dinner_tags schema (bolt 009-dinner-catalog)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Could NOT be executed against the live linked project this time (no raw SQL
-- execute access in this session, and Docker is not running locally either —
-- see ddd-03-test-report.md for what was verified another way). Written as a
-- durable, re-runnable regression suite for the next time Docker/CI is available.

begin;
select plan(10);

-- Schema shape
select has_table('public', 'tags', 'tags table exists');
select has_table('public', 'dinner_tags', 'dinner_tags table exists');
select hasnt_column('public', 'dinners', 'rosie_approved', 'dinners.rosie_approved has been dropped');
select col_is_unique('public', 'tags', array['name'], 'tags.name is unique');

-- Constraints
select throws_ok(
  $$ insert into public.tags (name) values ('Kid-Friendly') $$,
  '23514',
  null,
  'rejects a non-lowercase tag name'
);

select lives_ok(
  $$ insert into public.tags (name) values ('kid-friendly') $$,
  'accepts an already-lowercase tag name'
);

select throws_ok(
  $$ insert into public.dinner_tags (dinner_id, tag_id)
     select d.id, t.id, d.id, t.id from public.dinners d, public.tags t
     where t.name = 'kid-friendly' limit 1
     union all
     select d.id, t.id from public.dinners d, public.tags t
     where t.name = 'kid-friendly' limit 1 $$,
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
  'authenticated role can read tags (RLS)'
);
reset role;

-- No auto-migration of old rosie_approved data
select is(
  (select count(*) from public.dinner_tags)::int,
  0,
  'no dinner starts pre-tagged — dinner_tags is empty immediately after migration'
);

select * from finish();
rollback;
