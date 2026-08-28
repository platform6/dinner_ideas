-- pgTAP tests for the default grocery-store-config seed (bolt 021-grocery-store-config, FR-15)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- `supabase test db` applies every migration first, so by the time these assertions run the
-- 20260828000000_grocery_store_config_defaults.sql seed has already executed. These checks
-- mirror the ones run directly against the live linked "dinner ideas" project during Stage 3
-- (see test-walkthrough.md), wrapped in a rolled-back transaction so they never mutate data.

begin;
select plan(5);

-- Exactly 5 rows, in the expected order.
select is(
  (select count(*)::int from public.grocery_store_rows),
  5,
  'grocery_store_rows has exactly 5 rows after the defaults seed'
);

select results_eq(
  $$ select name, position from public.grocery_store_rows order by position $$,
  $$ values ('Dairy', 1), ('Grains', 2), ('Pantry', 3), ('Produce', 4), ('Protein', 5) $$,
  'default rows are Dairy, Grains, Pantry, Produce, Protein at positions 1..5'
);

-- Exactly 5 category assignments, each pointing at the row of the same name.
select is(
  (select count(*)::int from public.category_row_assignments),
  5,
  'category_row_assignments has exactly 5 rows after the defaults seed'
);

select results_eq(
  $$
    select c.category, r.name
    from public.category_row_assignments c
    join public.grocery_store_rows r on r.id = c.row_id
    order by c.category
  $$,
  $$ values ('Dairy', 'Dairy'), ('Grains', 'Grains'), ('Pantry', 'Pantry'),
            ('Produce', 'Produce'), ('Protein', 'Protein') $$,
  'each seed ingredient category is assigned to the row of the same name'
);

select is(
  (select count(*)::int
   from public.category_row_assignments c
   join public.grocery_store_rows r on r.id = c.row_id
   where c.category <> r.name),
  0,
  'no assignment points at a differently-named row'
);

select * from finish();
rollback;
