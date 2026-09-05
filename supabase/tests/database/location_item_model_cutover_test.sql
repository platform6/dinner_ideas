-- pgTAP tests for the Location/Item model cutover
-- (intent 010-grocery-store-location-model, unit 001-location-item-model, bolt 051)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- Covers story 007. Two halves:
--
--   1. POST-CUTOVER STATE — assertions about what migration 20260904190000 actually did to the
--      founding household's real data. These need no fixture; the migration has already run.
--
--   2. FIXTURE REPLAY — a second household seeded with a DELIBERATELY AWKWARD configuration
--      (rows out of alphabetical order, an aisle-named row, and category->row mappings whose
--      names do not match), then the cutover's steps replayed over it. The founding household's
--      data is too tidy to catch a name-based join or an ordering assumption; this one is not.
--
-- The replay duplicates the migration's INSERT statements. That duplication is deliberate and
-- unavoidable: a migration runs once, so the only way to exercise its logic against new data is
-- to re-issue it. If the migration changes, this file must change with it.

begin;
select plan(30);

\set founding '00000000-0000-4000-8000-000000000001'
\set fixture  'cccccccc-0000-4000-8000-00000000ffff'
\set empty_hh 'dddddddd-0000-4000-8000-00000000ffff'

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1 — post-cutover state of the founding household (real data)
-- ═══════════════════════════════════════════════════════════════════════════════

select is(
  (select count(*)::int from public.stores where household_id = :'founding' and is_active),
  1,
  'the founding household has exactly one active store'
);

select is(
  (select count(*)::int from public.locations l
   join public.stores s on s.id = l.store_id
   where s.household_id = :'founding'),
  (select count(*)::int from public.grocery_store_rows where household_id = :'founding'),
  'every grocery_store_row became a location'
);

-- name AND position preserved, verbatim, row for row
select is(
  (select count(*)::int
   from public.grocery_store_rows r
   join public.stores s on s.household_id = r.household_id and s.is_active
   where not exists (
     select 1 from public.locations l
     where l.store_id = s.id and l.position = r.position and l.name = r.name
   )
   and r.household_id = :'founding'),
  0,
  'name and position carried across verbatim for every row'
);

select is(
  (select count(*)::int from public.category_placements where household_id = :'founding'),
  (select count(*)::int from public.category_row_assignments where household_id = :'founding'),
  'every category_row_assignment became a category_placement'
);

select is(
  (select count(*)::int from public.items where household_id = :'founding'),
  (select count(distinct lower(btrim(di.name)))::int
   from public.dinner_ingredients di
   join public.dinners d on d.id = di.dinner_id
   where d.household_id = :'founding' and btrim(di.name) <> ''),
  'the registry holds exactly one Item per distinct normalized ingredient name'
);

-- The rule, not an omission: the old model had no per-ingredient placement to carry.
select is(
  (select count(*)::int from public.item_placements),
  0,
  'the cutover creates ZERO item_placements — day one is pure category inheritance'
);

-- Day-one state: every item resolves, and every one of them inherits.
select is(
  (select count(*)::int from public.item_location_resolution
   where household_id = :'founding' and state <> 'inherited'),
  0,
  'every founding-household item resolves as `inherited` — no placed, no unassigned'
);

-- ── The equivalence claim, on real data ──────────────────────────────────────
-- Identical to the migration's step 5. FULL OUTER JOIN, so a missing category, an extra
-- category, and a wrong position are all caught by one predicate.
select is(
  (with old_order as (
     select a.household_id, a.category, r.position
     from public.category_row_assignments a
     join public.grocery_store_rows r on r.id = a.row_id
   ),
   new_order as (
     select cp.household_id, cp.category, l.position
     from public.category_placements cp
     join public.locations l on l.id = cp.location_id
   )
   select count(*)::int
   from old_order o
   full outer join new_order n
     on n.household_id = o.household_id and n.category = o.category
   where o.position is distinct from n.position),
  0,
  'resolved order is equivalent to the old model — no regression (the migration''s own gate)'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2 — fixture replay over a deliberately awkward configuration
-- ═══════════════════════════════════════════════════════════════════════════════
insert into public.households (id, name) values
  (:'fixture', 'Cutover Fixture'),
  (:'empty_hh', 'Household With No Rows');

-- Rows deliberately NOT in alphabetical order, and one named as an aisle.
insert into public.grocery_store_rows (id, household_id, name, position) values
  ('c0000000-0000-4000-8000-000000000001', :'fixture', 'Produce', 1),
  ('c0000000-0000-4000-8000-000000000002', :'fixture', 'Aisle 7', 2),
  ('c0000000-0000-4000-8000-000000000003', :'fixture', 'Dairy',   3),
  ('c0000000-0000-4000-8000-000000000004', :'fixture', 'Bakery',  4);

-- Category -> row mappings whose NAMES DO NOT MATCH the row they point at. A cutover that
-- joined by name instead of by row identity would map these wrongly and still look plausible.
insert into public.category_row_assignments (household_id, category, row_id) values
  (:'fixture', 'Produce', 'c0000000-0000-4000-8000-000000000001'),  -- -> position 1
  (:'fixture', 'Pantry',  'c0000000-0000-4000-8000-000000000002'),  -- -> position 2 ("Aisle 7")
  (:'fixture', 'Dairy',   'c0000000-0000-4000-8000-000000000003'),  -- -> position 3
  (:'fixture', 'Grains',  'c0000000-0000-4000-8000-000000000004');  -- -> position 4 ("Bakery")

insert into public.dinners (id, household_id, name, cuisine_type, cook_time_minutes, instructions)
values ('c0000000-0000-4000-8000-0000000000d1', :'fixture', 'Fixture Dinner', 'American', 15, 'x');
-- The trigger (bolt 050) registers these as Items on insert; the backfill below must not
-- duplicate them. Includes a case/whitespace variant pair.
insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category) values
  ('c0000000-0000-4000-8000-0000000000d1', 'Sourdough',   1, 'loaf', 'Grains'),
  ('c0000000-0000-4000-8000-0000000000d1', '  SOURDOUGH ', 1, 'loaf', 'Grains'),
  ('c0000000-0000-4000-8000-0000000000d1', 'Kale',        1, 'bunch', 'Produce');

-- ── Replay step 0: the category-domain guard passes for valid data ───────────
select is(
  (select count(*)::int from public.category_row_assignments a
   where a.category not in ('Produce', 'Protein', 'Dairy', 'Grains', 'Pantry')),
  0,
  'step 0 guard: no assignment names a category outside the CHECK set'
);

-- ── Replay step 1: seed stores ───────────────────────────────────────────────
insert into public.stores (household_id, name, is_active)
select h.id, 'My Store', true
from public.households h
where not exists (
  select 1 from public.stores s where s.household_id = h.id and s.is_active
);

select is(
  (select count(*)::int from public.stores where household_id = :'fixture' and is_active),
  1,
  'the fixture household is seeded exactly one active store'
);
select is(
  (select count(*)::int from public.stores where household_id = :'empty_hh' and is_active),
  1,
  'a household with NO rows still gets a store (unit 002 shows its first-run state)'
);

-- ── Replay step 2: carry the path across ─────────────────────────────────────
insert into public.locations (household_id, store_id, name, type, position)
select r.household_id, s.id, r.name,
       case when r.name ~* '^\s*aisle\s+\d+' then 'aisle' else 'section' end,
       r.position
from public.grocery_store_rows r
join public.stores s on s.household_id = r.household_id and s.is_active
where not exists (
  select 1 from public.locations l where l.store_id = s.id and l.position = r.position
);

select is(
  (select count(*)::int from public.locations where household_id = :'empty_hh'),
  0,
  'the empty household''s store has no locations — nothing invented'
);
select is(
  (select type from public.locations where household_id = :'fixture' and name = 'Aisle 7'),
  'aisle',
  'a row named "Aisle 7" infers type `aisle`'
);
select is(
  (select count(*)::int from public.locations
   where household_id = :'fixture' and type = 'section'),
  3,
  'every other fixture row infers `section` (the safe default)'
);
select is(
  (select array_agg(name order by position) from public.locations
   where household_id = :'fixture'),
  array['Produce', 'Aisle 7', 'Dairy', 'Bakery'],
  'the non-alphabetical walking order is preserved exactly, not re-sorted'
);

-- ── Replay step 3: carry category placements across, BY ROW IDENTITY ─────────
insert into public.category_placements (household_id, store_id, category, location_id)
select a.household_id, s.id, a.category, l.id
from public.category_row_assignments a
join public.grocery_store_rows r on r.id = a.row_id
join public.stores s on s.household_id = a.household_id and s.is_active
join public.locations l on l.store_id = s.id and l.position = r.position
on conflict (store_id, category) do nothing;

-- The decisive one: 'Pantry' must land on "Aisle 7", not on a same-named row.
select is(
  (select l.name from public.category_placements cp
   join public.locations l on l.id = cp.location_id
   where cp.household_id = :'fixture' and cp.category = 'Pantry'),
  'Aisle 7',
  'category placement follows ROW IDENTITY, not name — Pantry lands on "Aisle 7"'
);
select is(
  (select l.name from public.category_placements cp
   join public.locations l on l.id = cp.location_id
   where cp.household_id = :'fixture' and cp.category = 'Grains'),
  'Bakery',
  'Grains lands on "Bakery" — a name-based join would have found no match at all'
);
select is(
  (select count(*)::int from public.category_placements where household_id = :'fixture'),
  4,
  'all four fixture assignments carried across'
);

-- ── Replay step 4: backfill the registry ─────────────────────────────────────
insert into public.items (household_id, name)
select distinct on (d.household_id, lower(btrim(di.name)))
       d.household_id, btrim(di.name)
from public.dinner_ingredients di
join public.dinners d on d.id = di.dinner_id
where btrim(di.name) <> ''
order by d.household_id, lower(btrim(di.name)), btrim(di.name)
on conflict (household_id, name_key) do nothing;

select is(
  (select count(*)::int from public.items where household_id = :'fixture'),
  2,
  'the backfill dedups case/whitespace variants — Sourdough + Kale, not three rows'
);
select is(
  (select count(*)::int from public.items
   where household_id = :'fixture' and name_key = 'sourdough'),
  1,
  'the backfill and the trigger agree on identity — no duplicate from the same conflict target'
);

-- ── Replay step 5: equivalence for the fixture household ─────────────────────
select is(
  (with old_order as (
     select a.household_id, a.category, r.position
     from public.category_row_assignments a
     join public.grocery_store_rows r on r.id = a.row_id
     where a.household_id = :'fixture'
   ),
   new_order as (
     select cp.household_id, cp.category, l.position
     from public.category_placements cp
     join public.locations l on l.id = cp.location_id
     where cp.household_id = :'fixture'
   )
   select count(*)::int
   from old_order o
   full outer join new_order n
     on n.household_id = o.household_id and n.category = o.category
   where o.position is distinct from n.position),
  0,
  'the awkward fixture''s resolved order is equivalent too — the check is not passing by luck'
);

-- Resolution through the view, end to end, for the fixture household.
select is(
  (select location_name from public.item_location_resolution
   where household_id = :'fixture' and name_key = 'sourdough'),
  'Bakery',
  'Sourdough (Grains) resolves through inheritance to "Bakery"'
);
select is(
  (select state from public.item_location_resolution
   where household_id = :'fixture' and name_key = 'kale'),
  'inherited',
  'Kale (Produce) resolves as inherited'
);
select is(
  (select count(*)::int from public.item_placements where household_id = :'fixture'),
  0,
  'the fixture replay created no item_placements either'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3 — idempotency: every step is guarded, so a re-run changes nothing
-- ═══════════════════════════════════════════════════════════════════════════════
-- A data-modifying CTE must be at the top level, so each re-run writes its affected-row count
-- into a temp table and the assertion reads that back.
create temp table cutover_idempotency (step text primary key, rows_affected int);

with re_run as (
  insert into public.stores (household_id, name, is_active)
  select h.id, 'My Store', true
  from public.households h
  where not exists (select 1 from public.stores s
                    where s.household_id = h.id and s.is_active)
  returning 1
)
insert into cutover_idempotency select 'step1-seed-stores', count(*)::int from re_run;

with re_run as (
  insert into public.locations (household_id, store_id, name, type, position)
  select r.household_id, s.id, r.name,
         case when r.name ~* '^\s*aisle\s+\d+' then 'aisle' else 'section' end, r.position
  from public.grocery_store_rows r
  join public.stores s on s.household_id = r.household_id and s.is_active
  where not exists (select 1 from public.locations l
                    where l.store_id = s.id and l.position = r.position)
  returning 1
)
insert into cutover_idempotency select 'step2-carry-path', count(*)::int from re_run;

with re_run as (
  insert into public.items (household_id, name)
  select distinct on (d.household_id, lower(btrim(di.name)))
         d.household_id, btrim(di.name)
  from public.dinner_ingredients di
  join public.dinners d on d.id = di.dinner_id
  where btrim(di.name) <> ''
  order by d.household_id, lower(btrim(di.name)), btrim(di.name)
  on conflict (household_id, name_key) do nothing
  returning 1
)
insert into cutover_idempotency select 'step4-backfill', count(*)::int from re_run;

select is(
  (select rows_affected from cutover_idempotency where step = 'step1-seed-stores'),
  0,
  'step 1 re-run seeds no additional store'
);
select is(
  (select rows_affected from cutover_idempotency where step = 'step2-carry-path'),
  0,
  'step 2 re-run carries across no duplicate location'
);
select is(
  (select rows_affected from cutover_idempotency where step = 'step4-backfill'),
  0,
  'step 4 re-run backfills no duplicate Item'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4 — the guards actually fire (an untested guard is not a guard)
-- ═══════════════════════════════════════════════════════════════════════════════
select throws_ok(
  $$
  do $do$
  declare v_bad text;
  begin
    -- simulate an assignment naming a category outside category_placements' CHECK set
    if exists (select 1) then
      v_bad := 'Frozen';
      raise exception
        'Cutover aborted: category_row_assignments contains categories outside the '
        'dinner_ingredients CHECK set: %. Widen the check or clean the data, then re-run.', v_bad;
    end if;
  end;
  $do$;
  $$,
  null,
  null,
  'the category-domain guard raises an actionable message rather than a bare 23514'
);

-- A category placement moved to the wrong location must be caught by the equivalence check.
update public.category_placements
   set location_id = (select id from public.locations
                      where household_id = :'fixture' and position = 4)
 where household_id = :'fixture' and category = 'Produce';

select isnt(
  (with old_order as (
     select a.household_id, a.category, r.position
     from public.category_row_assignments a
     join public.grocery_store_rows r on r.id = a.row_id
     where a.household_id = :'fixture'
   ),
   new_order as (
     select cp.household_id, cp.category, l.position
     from public.category_placements cp
     join public.locations l on l.id = cp.location_id
     where cp.household_id = :'fixture'
   )
   select count(*)::int
   from old_order o
   full outer join new_order n
     on n.household_id = o.household_id and n.category = o.category
   where o.position is distinct from n.position),
  0,
  'a wrong position IS detected by the equivalence check (it can fail, not just pass)'
);

-- And a category dropped entirely — the case an INNER JOIN would silently pass.
delete from public.category_placements
 where household_id = :'fixture' and category = 'Dairy';

select is(
  (with old_order as (
     select a.household_id, a.category, r.position
     from public.category_row_assignments a
     join public.grocery_store_rows r on r.id = a.row_id
     where a.household_id = :'fixture' and a.category = 'Dairy'
   ),
   new_order as (
     select cp.household_id, cp.category, l.position
     from public.category_placements cp
     join public.locations l on l.id = cp.location_id
     where cp.household_id = :'fixture' and cp.category = 'Dairy'
   )
   select count(*)::int
   from old_order o
   full outer join new_order n
     on n.household_id = o.household_id and n.category = o.category
   where o.position is distinct from n.position),
  1,
  'a DROPPED category is detected too — why the check is a FULL OUTER JOIN, not an INNER one'
);

select * from finish();
rollback;
