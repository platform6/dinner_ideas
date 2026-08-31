-- pgTAP tests for household_id on the domain tables + function scoping
-- (bolt 027-household-data-model; stories 003, 009)
-- Run locally via: supabase test db
--
-- Assumes bolts 026 + 027 migrations are applied. Bolt 028 (RLS rewrite) is NOT required for
-- these cases — they exercise the columns/constraints and the RPC/trigger scoping directly as a
-- superuser, using explicit household_id values (the null-household default is bypassed).

begin;
select plan(19);

-- ── household_id columns on the six direct-column tables ─────────────────────
select has_column('public', 'dinners', 'household_id', 'dinners.household_id added');
select has_column('public', 'tags', 'household_id', 'tags.household_id added');
select has_column('public', 'grocery_store_rows', 'household_id', 'grocery_store_rows.household_id added');
select has_column('public', 'category_row_assignments', 'household_id', 'category_row_assignments.household_id added');
select has_column('public', 'weekly_plans', 'household_id', 'weekly_plans.household_id added');
select has_column('public', 'meal_history', 'household_id', 'meal_history.household_id added');
select has_index('public', 'dinners', 'idx_dinners_household_id', 'dinners.household_id is indexed');

-- ── child tables get NO column ──────────────────────────────────────────────
select hasnt_column('public', 'dinner_ingredients', 'household_id', 'dinner_ingredients has no household_id (child)');
select hasnt_column('public', 'weekly_plan_selections', 'household_id', 'weekly_plan_selections has no household_id (child)');

-- ── reworked constraints ───────────────────────────────────────────────────
select col_is_unique('public', 'tags', array['household_id', 'name'], 'tags unique is (household_id, name)');
select col_is_unique('public', 'grocery_store_rows', array['household_id', 'position'],
  'grocery_store_rows unique is (household_id, position)');
select col_isnt_pk('public', 'category_row_assignments', 'category',
  'category_row_assignments.category alone is no longer the PK (interim unique until bolt 030)');

-- ── fixtures: two households with their own store rows ──────────────────────
insert into public.households (id, name) values
  ('a0000000-0000-0000-0000-00000000000a', 'HH A'),
  ('b0000000-0000-0000-0000-00000000000b', 'HH B');

insert into public.grocery_store_rows (household_id, name, position) values
  ('a0000000-0000-0000-0000-00000000000a', 'A-Dairy', 1),
  ('a0000000-0000-0000-0000-00000000000a', 'A-Produce', 2),
  ('a0000000-0000-0000-0000-00000000000a', 'A-Protein', 3),
  ('b0000000-0000-0000-0000-00000000000b', 'B-Dairy', 1),
  ('b0000000-0000-0000-0000-00000000000b', 'B-Produce', 2);

-- two households may share a tag name
select lives_ok(
  $$ insert into public.tags (household_id, name) values
       ('a0000000-0000-0000-0000-00000000000a', 'quick'),
       ('b0000000-0000-0000-0000-00000000000b', 'quick') $$,
  'two households can each define a tag named "quick"'
);
select throws_ok(
  $$ insert into public.tags (household_id, name) values
       ('a0000000-0000-0000-0000-00000000000a', 'quick') $$,
  '23505', null,
  'the same household cannot define "quick" twice'
);

-- ── reorder RPC is household-scoped (story 009) ─────────────────────────────
select lives_ok(
  $$
  do $do$
  declare v_a_produce uuid;
  begin
    select id into v_a_produce from public.grocery_store_rows
      where household_id = 'a0000000-0000-0000-0000-00000000000a' and name = 'A-Produce';
    perform public.reorder_grocery_store_row(v_a_produce, 3);

    if (select position from public.grocery_store_rows
        where household_id = 'a0000000-0000-0000-0000-00000000000a' and name = 'A-Produce') <> 3 then
      raise exception 'expected A-Produce at position 3';
    end if;
  end;
  $do$;
  $$,
  'reordering a row in household A moves it within A'
);

select results_eq(
  $$ select name, position from public.grocery_store_rows
     where household_id = 'b0000000-0000-0000-0000-00000000000b' order by position $$,
  $$ values ('B-Dairy', 1), ('B-Produce', 2) $$,
  'household B store-row positions are untouched by household A''s reorder'
);

select throws_ok(
  $$
  do $do$
  declare v_a_dairy uuid;
  begin
    select id into v_a_dairy from public.grocery_store_rows
      where household_id = 'a0000000-0000-0000-0000-00000000000a' and name = 'A-Dairy';
    -- household A has 3 rows; position 4 is out of range for A even though A+B have 5 total
    perform public.reorder_grocery_store_row(v_a_dairy, 4);
  end;
  $do$;
  $$,
  null, null,
  'reorder range check counts only the target household''s rows (A has 3, so 4 is rejected)'
);

-- ── meal-history trigger stamps household_id from the parent plan ───────────
select lives_ok(
  $$
  do $do$
  declare
    v_plan uuid;
    v_d1 uuid; v_d2 uuid; v_d3 uuid;
  begin
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values ('a0000000-0000-0000-0000-00000000000a', 'HH-A Dinner 1', 'Test', 10, 'x') returning id into v_d1;
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values ('a0000000-0000-0000-0000-00000000000a', 'HH-A Dinner 2', 'Test', 10, 'x') returning id into v_d2;
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values ('a0000000-0000-0000-0000-00000000000a', 'HH-A Dinner 3', 'Test', 10, 'x') returning id into v_d3;

    insert into public.weekly_plans (household_id, start_date)
      values ('a0000000-0000-0000-0000-00000000000a', date '2026-09-07') returning id into v_plan;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values
      (v_plan, v_d1), (v_plan, v_d2), (v_plan, v_d3);

    update public.weekly_plans set locked_at = now() where id = v_plan;

    if (select count(*) from public.meal_history
        where weekly_plan_id = v_plan
          and household_id = 'a0000000-0000-0000-0000-00000000000a') <> 3 then
      raise exception 'expected 3 meal_history rows carrying household A''s id';
    end if;
  end;
  $do$;
  $$,
  'locking a household-A plan writes 3 meal_history rows with household_id = A'
);

-- ── guard triggers unchanged: exactly-3-to-lock still enforced ──────────────
select throws_ok(
  $$
  do $do$
  declare
    v_plan uuid;
    v_d uuid;
  begin
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values ('b0000000-0000-0000-0000-00000000000b', 'HH-B Dinner', 'Test', 10, 'x') returning id into v_d;
    insert into public.weekly_plans (household_id, start_date)
      values ('b0000000-0000-0000-0000-00000000000b', date '2026-09-14') returning id into v_plan;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (v_plan, v_d);
    update public.weekly_plans set locked_at = now() where id = v_plan;  -- only 1 selection
  end;
  $do$;
  $$,
  null, null,
  'require-exactly-3-to-lock still fires on the new schema (regression)'
);

select * from finish();
rollback;
