-- pgTAP tests for Item review state
-- (intent 013-placement-edit-control, unit 001-placement-review-state, bolt 055)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Covers stories 001 and 002: the reviewed_at column, its backfill, the sync trigger leaving new
-- items unreviewed, the mark_item_reviewed RPC, and — the point of ADR-10 — that items remains
-- unwritable by application code even though one of its columns is now user-settable.
--
-- Seeds two households (R and S) so the cross-household assertion has a real foreign row to fail
-- against, then runs as a member of R. Superuser seeding bypasses RLS deliberately; every access
-- assertion runs after `set local role authenticated`.

begin;
select plan(19);

set local app.provisioning_disabled = 'on';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Schema shape (story 001)
-- ═══════════════════════════════════════════════════════════════════════════════
select has_column('public', 'items', 'reviewed_at', 'items has a reviewed_at column');
select col_is_null('public', 'items', 'reviewed_at',
  'reviewed_at is NULLABLE — null IS the unreviewed state, so it must be storable');
select col_hasnt_default('public', 'items', 'reviewed_at',
  'reviewed_at has NO default: a default would mark every trigger-created item reviewed on '
  'arrival and empty the review queue permanently (INV-2)');

select has_function('public', 'mark_item_reviewed', array['uuid'],
  'mark_item_reviewed(uuid) exists');
select is(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'mark_item_reviewed'),
  true,
  'mark_item_reviewed is SECURITY DEFINER — items has no UPDATE privilege for a security '
  'invoker function to use (ADR-10)');

select has_column('public', 'item_location_resolution', 'reviewed_at',
  'the resolution view projects reviewed_at, so the queue needs no second query');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fixtures: two households, each with a store, a path, and a dinner to hang items on
-- ═══════════════════════════════════════════════════════════════════════════════
insert into auth.users (id, email) values
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'rev-r@example.test'),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'rev-s@example.test');
insert into public.profiles (id, display_name) values
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'R'),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'S');
insert into public.households (id, name) values
  ('cccccccc-0000-0000-0000-00000000ffff', 'HH R'),
  ('dddddddd-0000-0000-0000-00000000ffff', 'HH S');
insert into public.household_members (household_id, profile_id, role) values
  ('cccccccc-0000-0000-0000-00000000ffff', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'owner'),
  ('dddddddd-0000-0000-0000-00000000ffff', 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'owner');

insert into public.stores (id, household_id, name) values
  ('c0000000-0000-4000-8000-00000000000c', 'cccccccc-0000-0000-0000-00000000ffff', 'R Store');

insert into public.dinners (id, household_id, name, cuisine_type, cook_time_minutes, instructions) values
  ('c0000000-0000-4000-8000-0000000000d1', 'cccccccc-0000-0000-0000-00000000ffff',
   'R Dinner', 'Test', 10, 'n/a'),
  ('d0000000-0000-4000-8000-0000000000d2', 'dddddddd-0000-0000-0000-00000000ffff',
   'S Dinner', 'Test', 10, 'n/a');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 001: a trigger-created item arrives UNREVIEWED
-- ═══════════════════════════════════════════════════════════════════════════════
-- This is the behaviour the whole feature rests on, and it is a consequence of the column
-- having no default — trg_dinner_ingredients_sync_item was deliberately NOT modified.
insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category) values
  ('c0000000-0000-4000-8000-0000000000d1', 'review probe alpha', 1, 'ea', 'Pantry');

select is(
  (select reviewed_at from public.items
   where household_id = 'cccccccc-0000-0000-0000-00000000ffff' and name_key = 'review probe alpha'),
  null,
  'an item registered by the sync trigger arrives with reviewed_at NULL, with no trigger change');

select isnt(
  (select id from public.items
   where household_id = 'cccccccc-0000-0000-0000-00000000ffff' and name_key = 'review probe alpha'),
  null,
  'the sync trigger still registers the item at all (the column did not break ADR-7 path)');

-- An item in the OTHER household, for the isolation test below.
insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category) values
  ('d0000000-0000-4000-8000-0000000000d2', 'foreign probe', 1, 'ea', 'Pantry');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 002: the write path — ADR-10's invariant
-- ═══════════════════════════════════════════════════════════════════════════════
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3","role":"authenticated"}';

-- INV-1. The reason this bolt uses an RPC at all. If either of these two ever passes, ADR-7's
-- single-writer guarantee is gone and grocery identity has two authors — exactly the failure
-- ADR-10 chose a function over a column grant to keep loud.
select throws_ok(
  $$ update public.items set name = 'renamed by app' where name_key = 'review probe alpha' $$,
  '42501',
  null,
  'application code CANNOT write items.name — the registry stays trigger-owned (ADR-7)');

select throws_ok(
  $$ update public.items set reviewed_at = now() where name_key = 'review probe alpha' $$,
  '42501',
  null,
  'application code cannot write items.reviewed_at DIRECTLY either — the RPC is the only door, '
  'not merely the convenient one (ADR-10)');

-- The permitted path.
select lives_ok(
  $$ select public.mark_item_reviewed(
       (select item_id from public.item_location_resolution where name_key = 'review probe alpha')) $$,
  'a household member can mark their own item reviewed through the RPC');

select isnt(
  (select reviewed_at from public.items
   where household_id = 'cccccccc-0000-0000-0000-00000000ffff' and name_key = 'review probe alpha'),
  null,
  'the RPC actually set reviewed_at');

-- INV-3. Idempotent, so every caller can fire it without checking first.
select lives_ok(
  $$ select public.mark_item_reviewed(
       (select id from public.items where name_key = 'review probe alpha')) $$,
  're-marking an already-reviewed item is legal and inert (INV-3)');

-- INV-4. security definer bypasses RLS, so the household check is the function's own
-- responsibility. Forgetting it would be a cross-household WRITE, not a refused one — which is
-- why this assertion exists rather than being inferred from the table's policies.
select lives_ok(
  $$ select public.mark_item_reviewed(
       (select id from public.items where name_key = 'foreign probe')) $$,
  'marking another household''s item returns normally — no error leaks whether that id exists');

reset role;

select is(
  (select reviewed_at from public.items
   where household_id = 'dddddddd-0000-0000-0000-00000000ffff' and name_key = 'foreign probe'),
  null,
  'and it did NOT touch the other household''s item — silence is not permission (INV-4)');

-- A missing id behaves the same way: zero rows, no error.
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3","role":"authenticated"}';
select lives_ok(
  $$ select public.mark_item_reviewed('00000000-0000-4000-8000-00000000dead'::uuid) $$,
  'a nonexistent item id affects zero rows and returns normally');
reset role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 002: execute privileges
-- ═══════════════════════════════════════════════════════════════════════════════
select ok(
  has_function_privilege('authenticated', 'public.mark_item_reviewed(uuid)', 'execute'),
  'authenticated may execute mark_item_reviewed');

select ok(
  not has_function_privilege('anon', 'public.mark_item_reviewed(uuid)', 'execute'),
  'anon may NOT execute mark_item_reviewed');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 001: the backfill left nothing behind
-- ═══════════════════════════════════════════════════════════════════════════════
-- Every item that predates this migration carries a mark. Scoped to the seeded founding
-- household so the two probes above (deliberately unreviewed) do not confuse the count.
select is(
  (select count(*) from public.items i
   join public.households h on h.id = i.household_id
   where h.id = '00000000-0000-4000-8000-000000000001' and i.reviewed_at is null),
  0::bigint,
  'the backfill marked every pre-existing item — no day-one queue of the whole registry');

rollback;
