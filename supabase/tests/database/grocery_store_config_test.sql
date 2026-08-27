-- pgTAP tests for the grocery-store-config schema/RPC (bolt 011-grocery-store-config)
-- Run locally via: supabase test db  (requires Docker/local Postgres)
--
-- These assertions mirror the checks that were run directly against the live linked
-- "dinner ideas" project during Stage 5 (see ddd-03-test-report.md) via `supabase db query`,
-- wrapped in its own rolled-back transaction. Kept here as a durable, re-runnable regression
-- suite for local/CI use.

begin;
select plan(9);

-- Schema shape
select has_table('public', 'grocery_store_rows', 'grocery_store_rows table exists');
select has_table('public', 'category_row_assignments', 'category_row_assignments table exists');
select col_is_unique('public', 'grocery_store_rows', array['position'], 'grocery_store_rows.position is unique');
select col_is_pk('public', 'category_row_assignments', array['category'], 'category_row_assignments.category is the primary key');

-- Reorder RPC behavior
select lives_ok(
  $$
  do $do$
  declare
    v_a uuid;
    v_b uuid;
    v_c uuid;
  begin
    insert into public.grocery_store_rows (name, position) values ('A', 1) returning id into v_a;
    insert into public.grocery_store_rows (name, position) values ('B', 2) returning id into v_b;
    insert into public.grocery_store_rows (name, position) values ('C', 3) returning id into v_c;

    perform public.reorder_grocery_store_row(v_b, 3);

    if (select position from public.grocery_store_rows where id = v_b) != 3 then
      raise exception 'expected B at position 3';
    end if;
    if (select position from public.grocery_store_rows where id = v_c) != 2 then
      raise exception 'expected C shifted to position 2';
    end if;
    if (select position from public.grocery_store_rows where id = v_a) != 1 then
      raise exception 'expected A unaffected at position 1';
    end if;
  end;
  $do$;
  $$,
  'reordering a row shifts the affected range and keeps positions unique'
);

select throws_ok(
  $$
  do $do$
  declare
    v_row uuid;
  begin
    select id into v_row from public.grocery_store_rows limit 1;
    perform public.reorder_grocery_store_row(v_row, 999);
  end;
  $do$;
  $$,
  null,
  null,
  'rejects an out-of-range position'
);

select throws_ok(
  $$ select public.reorder_grocery_store_row(gen_random_uuid(), 1) $$,
  null,
  null,
  'rejects a nonexistent row id'
);

-- Category assignment: cascade on row delete
select lives_ok(
  $$
  do $do$
  declare
    v_row uuid;
  begin
    insert into public.grocery_store_rows (name, position)
      values ('Temp Row', (select coalesce(max(position), 0) + 1 from public.grocery_store_rows))
      returning id into v_row;
    insert into public.category_row_assignments (category, row_id) values ('TestCategory', v_row);

    delete from public.grocery_store_rows where id = v_row;

    if exists (select 1 from public.category_row_assignments where category = 'TestCategory') then
      raise exception 'expected assignment to be gone after cascade delete';
    end if;
  end;
  $do$;
  $$,
  'deleting a row cascades its category assignment (category becomes unassigned, not orphaned)'
);

-- Row Level Security
set local role anon;
select is_empty(
  $$ select 1 from public.grocery_store_rows $$,
  'anon role cannot read grocery_store_rows (RLS)'
);
reset role;

set local role authenticated;
select lives_ok(
  $$ select 1 from public.grocery_store_rows $$,
  'authenticated role can read grocery_store_rows (RLS)'
);
reset role;

select * from finish();
rollback;
