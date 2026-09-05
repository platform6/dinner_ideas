-- pgTAP tests for the Store -> Location -> Item placement model
-- (intent 010-grocery-store-location-model, unit 001-location-item-model, bolt 050)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Covers stories 001-006: stores/locations schema + RLS, the items registry and its sync
-- trigger, item/category placements and their composite-FK containment, the resolution view's
-- three states, suggestion dismissals, and the reorder RPC.
--
-- Seeds two households (A and B) so every isolation assertion has a real foreign row to fail
-- against, then runs as a member of B. Superuser seeding bypasses RLS deliberately; the RLS
-- assertions all run after `set local role authenticated`.

begin;
select plan(53);

-- Fixtures insert into auth.users; suppress handle_new_user() so this test seeds both
-- households itself (the provisioning path is covered by account_model_provisioning_test.sql).
set local app.provisioning_disabled = 'on';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Schema shape (story 001, 003, 005)
-- ═══════════════════════════════════════════════════════════════════════════════
select has_table('public', 'stores', 'stores table exists');
select has_table('public', 'locations', 'locations table exists');
select has_table('public', 'items', 'items table exists');
select has_table('public', 'item_placements', 'item_placements table exists');
select has_table('public', 'category_placements', 'category_placements table exists');
select has_table('public', 'suggestion_dismissals', 'suggestion_dismissals table exists');

select col_is_unique('public', 'locations', array['store_id', 'position'],
  'locations are unique on (store_id, position)');
select col_is_unique('public', 'locations', array['id', 'store_id'],
  'locations carry the (id, store_id) composite-FK target (ADR-8)');
select col_is_unique('public', 'items', array['household_id', 'name_key'],
  'items dedup on (household_id, name_key)');
select col_is_unique('public', 'item_placements', array['item_id', 'store_id'],
  'one explicit placement per item per store');
select col_is_unique('public', 'category_placements', array['store_id', 'category'],
  'one category placement per category per store');

select col_not_null('public', 'item_placements', 'location_id',
  'item_placements.location_id is NOT NULL — "not placed" is row absence, not a null (RD-3)');
select col_not_null('public', 'category_placements', 'location_id',
  'category_placements.location_id is NOT NULL (RD-3)');

-- The single highest-risk line in the migration: without security_invoker the view runs as its
-- OWNER and RLS on every underlying table is bypassed.
select is(
  (select (c.reloptions::text like '%security_invoker=true%')
   from pg_class c where c.relname = 'item_location_resolution'),
  true,
  'item_location_resolution is security_invoker = true (else it leaks across households)'
);

select is(
  (select prosecdef from pg_proc where proname = 'fn_dinner_ingredients_sync_item'),
  true,
  'the registry sync trigger function is security definer'
);
select is(
  (select proconfig::text from pg_proc where proname = 'fn_dinner_ingredients_sync_item'),
  '{"search_path=\"\""}',
  'the registry sync function pins search_path (definer hardening)'
);
select is(
  (select count(*)::int from pg_trigger
   where tgrelid = 'public.dinner_ingredients'::regclass
     and tgname = 'trg_dinner_ingredients_sync_item' and not tgisinternal),
  1,
  'the registry sync trigger is attached to dinner_ingredients'
);

-- items is deliberately select-only for clients: the registry is written by the trigger alone.
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'items'
     and cmd in ('INSERT', 'UPDATE', 'DELETE')),
  0,
  'items has no client INSERT/UPDATE/DELETE policy (registry is trigger-written only, ADR-7)'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fixtures: two households, each with a store and a walking path
-- ═══════════════════════════════════════════════════════════════════════════════
insert into auth.users (id, email) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'loc-a@example.test'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'loc-b@example.test');
insert into public.profiles (id, display_name) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'A'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'B');
insert into public.households (id, name) values
  ('aaaaaaaa-0000-0000-0000-00000000ffff', 'HH A'),
  ('bbbbbbbb-0000-0000-0000-00000000ffff', 'HH B');
insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-0000-0000-0000-00000000ffff', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'owner'),
  ('bbbbbbbb-0000-0000-0000-00000000ffff', 'b2b2b2b2-b2b2-b2b2-b2b2b2b2b2b2b2b2', 'owner');

insert into public.stores (id, household_id, name) values
  ('a0000000-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000ffff', 'A Store'),
  ('b0000000-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000ffff', 'B Store');

-- B's walking path: sections and aisles interleaved in ONE sequence
insert into public.locations (id, household_id, store_id, name, type, position) values
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000ffff',
   'b0000000-0000-4000-8000-00000000000b', 'Produce', 'section', 1),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-0000-0000-0000-00000000ffff',
   'b0000000-0000-4000-8000-00000000000b', 'Aisle 3', 'aisle', 2),
  ('b0000000-0000-4000-8000-000000000003', 'bbbbbbbb-0000-0000-0000-00000000ffff',
   'b0000000-0000-4000-8000-00000000000b', 'Deli', 'section', 3),
  ('b0000000-0000-4000-8000-000000000004', 'bbbbbbbb-0000-0000-0000-00000000ffff',
   'b0000000-0000-4000-8000-00000000000b', 'Bakery', 'section', 4);
-- A's path, for the cross-store containment test
insert into public.locations (id, household_id, store_id, name, type, position) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000ffff',
   'a0000000-0000-4000-8000-00000000000a', 'A Aisle', 'aisle', 1);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 001: at most one ACTIVE store per household
-- ═══════════════════════════════════════════════════════════════════════════════
select throws_ok(
  $$ insert into public.stores (household_id, name, is_active)
     values ('bbbbbbbb-0000-0000-0000-00000000ffff', 'Second Active', true) $$,
  '23505',
  null,
  'a second ACTIVE store in one household is rejected'
);
select lives_ok(
  $$ insert into public.stores (household_id, name, is_active)
     values ('bbbbbbbb-0000-0000-0000-00000000ffff', 'Inactive Spare', false) $$,
  'an INACTIVE second store is allowed (v2-ready, partial index)'
);

select throws_ok(
  $$ insert into public.locations (household_id, store_id, name, type, position)
     values ('bbbbbbbb-0000-0000-0000-00000000ffff',
             'b0000000-0000-4000-8000-00000000000b', 'Bad Type', 'department', 9) $$,
  '23514',
  null,
  'a location type outside (section, aisle) is rejected'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 002: the registry sync trigger
-- ═══════════════════════════════════════════════════════════════════════════════
insert into public.dinners (id, household_id, name, cuisine_type, cook_time_minutes, instructions)
values ('b0000000-0000-4000-8000-0000000000d1', 'bbbbbbbb-0000-0000-0000-00000000ffff',
        'Registry Fixture', 'American', 20, 'x');

insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category) values
  ('b0000000-0000-4000-8000-0000000000d1', 'Black Beans', 1, 'can', 'Pantry'),
  ('b0000000-0000-4000-8000-0000000000d1', '  black beans  ', 2, 'can', 'Pantry'),
  ('b0000000-0000-4000-8000-0000000000d1', 'Cilantro', 1, 'bunch', 'Produce'),
  ('b0000000-0000-4000-8000-0000000000d1', 'Cheddar', 1, 'block', 'Dairy');

select is(
  (select count(*)::int from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff'),
  3,
  'the trigger registers one Item per distinct normalized name (4 rows -> 3 Items)'
);
select is(
  (select count(*)::int from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and name_key = 'black beans'),
  1,
  'names differing only in case/whitespace collapse to one Item'
);
select is(
  (select name from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and name_key = 'black beans'),
  'Black Beans',
  'the Item stores the trimmed display name as first written'
);

-- Renaming an ingredient registers the new name; the old Item is deliberately NOT pruned.
update public.dinner_ingredients set name = 'Pinto Beans'
where dinner_id = 'b0000000-0000-4000-8000-0000000000d1' and name = 'Cilantro';
select is(
  (select count(*)::int from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff'),
  4,
  'an `update of name` registers the new Item and leaves the old one in place (ADR-7)'
);

select lives_ok(
  $$ insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category)
     values ('b0000000-0000-4000-8000-0000000000d1', 'BLACK BEANS', 1, 'can', 'Pantry') $$,
  're-inserting an existing normalized name is a silent no-op (on conflict do nothing)'
);
select is(
  (select count(*)::int from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff'),
  4,
  'the no-op insert created no duplicate Item'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 003: composite-FK containment (ADR-8)
-- ═══════════════════════════════════════════════════════════════════════════════
select throws_ok(
  $$ insert into public.item_placements (household_id, store_id, item_id, location_id)
     select 'bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
            i.id, 'a0000000-0000-4000-8000-000000000001'
     from public.items i
     where i.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and i.name_key = 'black beans' $$,
  '23503',
  null,
  'placing an item at ANOTHER STORE''s location is rejected by the composite FK'
);
select throws_ok(
  $$ insert into public.category_placements (household_id, store_id, category, location_id)
     values ('bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
             'Produce', 'a0000000-0000-4000-8000-000000000001') $$,
  '23503',
  null,
  'a category placement at another store''s location is rejected by the composite FK'
);
select throws_ok(
  $$ insert into public.category_placements (household_id, store_id, category, location_id)
     values ('bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
             'produce', 'b0000000-0000-4000-8000-000000000001') $$,
  '23514',
  null,
  'a category outside dinner_ingredients'' CHECK set is rejected (inheritance is exact equality)'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 004: the resolution view's three states
-- ═══════════════════════════════════════════════════════════════════════════════
insert into public.item_placements (household_id, store_id, item_id, location_id)
select 'bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
       i.id, 'b0000000-0000-4000-8000-000000000004'
from public.items i
where i.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and i.name_key = 'black beans';

-- Pantry -> Aisle 3 deliberately ALSO covers Black Beans, which has an explicit placement:
-- that is what proves explicit beats inherited rather than merely filling a gap.
insert into public.category_placements (household_id, store_id, category, location_id) values
  ('bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
   'Pantry', 'b0000000-0000-4000-8000-000000000002'),
  ('bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
   'Produce', 'b0000000-0000-4000-8000-000000000001');

select is(
  (select state from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'black beans'),
  'placed',
  'an explicit placement resolves to `placed` — and beats the category placement that also matches'
);
select is(
  (select location_name from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'black beans'),
  'Bakery',
  'the explicit placement''s location wins over the inherited one'
);
select is(
  (select state from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'pinto beans'),
  'inherited',
  'an item with no explicit placement inherits from its category'
);
select is(
  (select via_category from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'pinto beans'),
  'Produce',
  'the inherited row names the category it came from (so the UI can say "via Produce")'
);
select is(
  (select state from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'cheddar'),
  'unassigned',
  'an item whose category has no placement resolves to `unassigned`, not an error'
);
select is(
  (select location_id from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'cheddar'),
  null,
  'an unassigned item has a null location_id'
);
-- Totality: every Item yields exactly one row per store, in every state.
select is(
  (select count(*)::int from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b'),
  (select count(*)::int from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff'),
  'resolution is TOTAL — one row per Item per store, never a dropped or duplicated Item'
);

-- Deleting a location cascades its placements; Items themselves survive.
delete from public.locations where id = 'b0000000-0000-4000-8000-000000000004';
select is(
  (select state from public.item_location_resolution
   where store_id = 'b0000000-0000-4000-8000-00000000000b' and name_key = 'black beans'),
  'inherited',
  'deleting a location drops the explicit placement and the item falls back to its category'
);
select is(
  (select count(*)::int from public.items
   where household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff'),
  4,
  'deleting a location never deletes an Item'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 005: suggestion dismissals
-- ═══════════════════════════════════════════════════════════════════════════════
select throws_ok(
  $$ insert into public.suggestion_dismissals (household_id, store_id, item_id, suggested_item_id)
     select 'bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
            i.id, i.id
     from public.items i
     where i.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and i.name_key = 'cheddar' $$,
  '23514',
  null,
  'an item cannot be its own suggestion'
);
select lives_ok(
  $$ insert into public.suggestion_dismissals (household_id, store_id, item_id, suggested_item_id)
     select 'bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
            a.id, b.id
     from public.items a, public.items b
     where a.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and a.name_key = 'cheddar'
       and b.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and b.name_key = 'black beans'
     on conflict (store_id, item_id, suggested_item_id) do nothing $$,
  'a dismissal is recorded'
);
select lives_ok(
  $$ insert into public.suggestion_dismissals (household_id, store_id, item_id, suggested_item_id)
     select 'bbbbbbbb-0000-0000-0000-00000000ffff', 'b0000000-0000-4000-8000-00000000000b',
            a.id, b.id
     from public.items a, public.items b
     where a.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and a.name_key = 'cheddar'
       and b.household_id = 'bbbbbbbb-0000-0000-0000-00000000ffff' and b.name_key = 'black beans'
     on conflict (store_id, item_id, suggested_item_id) do nothing $$,
  'dismissing the same pairing twice is a no-op, not an error'
);
select is(
  (select count(*)::int from public.suggestion_dismissals
   where store_id = 'b0000000-0000-4000-8000-00000000000b'),
  1,
  'the repeat dismissal created no duplicate row'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Story 006: the reorder RPC
-- ═══════════════════════════════════════════════════════════════════════════════
-- B's path is now Produce(1), Aisle 3(2), Deli(3) after the Bakery delete above.
select lives_ok(
  $$
  do $do$
  begin
    -- Move UP by 2 — the case sentinel-parking alone cannot handle, and the reason
    -- (store_id, position) is DEFERRABLE INITIALLY DEFERRED.
    perform public.reorder_location('b0000000-0000-4000-8000-000000000003', 1);

    if (select position from public.locations where id = 'b0000000-0000-4000-8000-000000000003') != 1 then
      raise exception 'expected Deli at position 1';
    end if;
    if (select position from public.locations where id = 'b0000000-0000-4000-8000-000000000001') != 2 then
      raise exception 'expected Produce shifted to 2';
    end if;
    if (select position from public.locations where id = 'b0000000-0000-4000-8000-000000000002') != 3 then
      raise exception 'expected Aisle 3 shifted to 3';
    end if;
  end;
  $do$;
  $$,
  'reordering UP across 2+ positions shifts the range and keeps (store_id, position) unique'
);
select lives_ok(
  $$
  do $do$
  begin
    perform public.reorder_location('b0000000-0000-4000-8000-000000000003', 3);
    if (select position from public.locations where id = 'b0000000-0000-4000-8000-000000000003') != 3 then
      raise exception 'expected Deli back at position 3';
    end if;
  end;
  $do$;
  $$,
  'reordering DOWN across 2+ positions works symmetrically'
);
select is(
  (select count(*)::int from public.locations
   where store_id = 'a0000000-0000-4000-8000-00000000000a' and position = 1),
  1,
  'reordering one store leaves another store''s positions untouched'
);
select throws_ok(
  $$ select public.reorder_location('b0000000-0000-4000-8000-000000000003', 99) $$,
  null,
  null,
  'an out-of-range position raises'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS isolation — as an authenticated member of household B
-- ═══════════════════════════════════════════════════════════════════════════════
set local role authenticated;
set local request.jwt.claims = '{"sub":"b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2","role":"authenticated"}';

select is(
  (select count(*)::int from public.stores
   where household_id = 'aaaaaaaa-0000-0000-0000-00000000ffff'),
  0,
  'RLS hides another household''s stores'
);
select is(
  (select count(*)::int from public.locations
   where household_id = 'aaaaaaaa-0000-0000-0000-00000000ffff'),
  0,
  'RLS hides another household''s locations'
);
select is(
  (select count(*)::int from public.items
   where household_id = 'aaaaaaaa-0000-0000-0000-00000000ffff'),
  0,
  'RLS hides another household''s items'
);
-- The security_invoker check that matters: the VIEW must not leak past RLS either.
select is(
  (select count(*)::int from public.item_location_resolution
   where household_id = 'aaaaaaaa-0000-0000-0000-00000000ffff'),
  0,
  'the resolution VIEW respects RLS — no cross-household rows (security_invoker = true)'
);
select lives_ok(
  $$ select 1 from public.item_location_resolution
     where store_id = 'b0000000-0000-4000-8000-00000000000b' $$,
  'an authenticated member can read their own household''s resolution rows'
);
select throws_ok(
  $$ insert into public.items (household_id, name)
     values ('bbbbbbbb-0000-0000-0000-00000000ffff', 'Hand Written') $$,
  '42501',
  null,
  'a client cannot insert into the registry directly — only the trigger writes items (ADR-7)'
);

reset role;

select * from finish();
rollback;
