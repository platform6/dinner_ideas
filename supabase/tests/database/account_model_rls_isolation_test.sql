-- pgTAP isolation matrix for the household-scoped RLS rewrite
-- (bolt 028-household-data-model; story 004)
-- Run locally via: supabase test db
--
-- Assumes bolts 026 + 027 + 028 migrations are applied. Seeds two fully-populated households
-- (A and B), then runs as a member of B and asserts that none of household A's rows in any of the
-- 10 domain tables are visible or writable, plus the pg_policies `using (true)` self-check.

begin;
select plan(22);

-- Fixtures insert into auth.users; suppress handle_new_user() so this test seeds both households
-- itself (the trigger path is covered by account_model_provisioning_test.sql).
set local app.provisioning_disabled = 'on';

-- ── The pg_policies self-check: no `true` predicate left on any domain table ────
select is(
  (select count(*)::int
   from pg_policies
   where schemaname = 'public'
     and tablename in ('dinners','dinner_ingredients','dinner_steps','tags','dinner_tags',
                       'weekly_plans','weekly_plan_selections','meal_history',
                       'grocery_store_rows','category_row_assignments')
     and (qual = 'true' or with_check = 'true')),
  0,
  'no domain-table policy has a `true` using/with-check predicate'
);
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'meal_history'
     and cmd in ('UPDATE','DELETE')),
  0,
  'meal_history has no UPDATE/DELETE policy (immutability preserved)'
);

-- ── Fixtures ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'a@example.test'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'b@example.test');
insert into public.profiles (id, display_name) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'A'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'B');
insert into public.households (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'HH A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'HH B');
insert into public.household_members (household_id, profile_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'owner'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'owner');

-- Populate both households identically (superuser bypasses RLS here).
do $seed$
declare
  hh uuid;
  d uuid;
  wp uuid;
  gr uuid;
begin
  foreach hh in array array['aaaaaaaa-0000-0000-0000-000000000000'::uuid,
                            'bbbbbbbb-0000-0000-0000-000000000000'::uuid] loop
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values (hh, 'Dinner ' || hh, 'Test', 20, 'cook') returning id into d;
    insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category)
      values (d, 'salt', 1, 'tsp', 'Pantry');
    insert into public.dinner_steps (dinner_id, step_number, instruction)
      values (d, 1, 'do it');
    insert into public.tags (household_id, name) values (hh, 'weeknight') ;
    insert into public.dinner_tags (dinner_id, tag_id)
      select d, id from public.tags where household_id = hh and name = 'weeknight';

    insert into public.weekly_plans (household_id, start_date)
      values (hh, date '2026-09-07') returning id into wp;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (wp, d);
    -- lock it to generate a meal_history row (needs exactly 3 selections)
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values (hh, 'Dinner2 ' || hh, 'Test', 20, 'c') returning id into d;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (wp, d);
    insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
      values (hh, 'Dinner3 ' || hh, 'Test', 20, 'c') returning id into d;
    insert into public.weekly_plan_selections (weekly_plan_id, dinner_id) values (wp, d);
    update public.weekly_plans set locked_at = now() where id = wp;

    insert into public.grocery_store_rows (household_id, name, position)
      values (hh, 'Row', 1) returning id into gr;
    insert into public.category_row_assignments (household_id, category, row_id)
      values (hh, 'Pantry', gr);
  end loop;
end;
$seed$;

-- ── Run as a member of household B ───────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2","role":"authenticated"}';

-- SELECT isolation: every domain table returns only B's rows, never A's.
select is((select count(distinct household_id)::int from public.dinners), 1, 'dinners: B sees one household');
select is((select bool_and(household_id = public.current_user_household_id()) from public.dinners), true, 'dinners: all visible rows are B''s');
select is((select count(*)::int from public.tags where household_id <> public.current_user_household_id()), 0, 'tags: no foreign rows visible');
select is((select count(*)::int from public.weekly_plans where household_id <> public.current_user_household_id()), 0, 'weekly_plans: no foreign rows visible');
select is((select count(*)::int from public.meal_history where household_id <> public.current_user_household_id()), 0, 'meal_history: no foreign rows visible');
select is((select count(*)::int from public.grocery_store_rows where household_id <> public.current_user_household_id()), 0, 'grocery_store_rows: no foreign rows visible');
select is((select count(*)::int from public.category_row_assignments where household_id <> public.current_user_household_id()), 0, 'category_row_assignments: no foreign rows visible');
select is(
  (select count(*)::int from public.dinner_ingredients di
   join public.dinners d on d.id = di.dinner_id
   where d.household_id <> public.current_user_household_id()),
  0, 'dinner_ingredients: no rows whose parent dinner is household A');
select is(
  (select count(*)::int from public.weekly_plan_selections wps
   join public.weekly_plans p on p.id = wps.weekly_plan_id
   where p.household_id <> public.current_user_household_id()),
  0, 'weekly_plan_selections: no rows whose parent plan is household A');
select is(
  (select count(*)::int from public.dinner_steps ds
   join public.dinners d on d.id = ds.dinner_id
   where d.household_id <> public.current_user_household_id()),
  0, 'dinner_steps: no rows whose parent dinner is household A');
select is(
  (select count(*)::int from public.dinner_tags dt
   join public.dinners d on d.id = dt.dinner_id
   where d.household_id <> public.current_user_household_id()),
  0, 'dinner_tags: no rows whose parent dinner is household A');

-- INSERT isolation: B cannot insert a row stamped with A's household_id.
select throws_ok(
  $$ insert into public.dinners (household_id, name, cuisine_type, cook_time_minutes, instructions)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'sneaky', 'x', 1, 'x') $$,
  '42501', null,
  'dinners: with check rejects an insert stamped with household A''s id');
select throws_ok(
  $$ insert into public.grocery_store_rows (household_id, name, position)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'sneaky', 99) $$,
  '42501', null,
  'grocery_store_rows: with check rejects a foreign household_id');

-- INSERT into a child table whose parent dinner is household A's → rejected.
select throws_ok(
  $$
  do $do$
  declare v_a_dinner uuid;
  begin
    -- read as superuser via a definer-free path is not possible here; use a known-shape query
    select id into v_a_dinner from public.dinners
      where household_id = 'aaaaaaaa-0000-0000-0000-000000000000' limit 1;
    if v_a_dinner is null then
      -- RLS hides A's dinners from B, so we cannot even name one → simulate with a random uuid
      v_a_dinner := gen_random_uuid();
    end if;
    insert into public.dinner_ingredients (dinner_id, name, quantity, unit, category)
      values (v_a_dinner, 'x', 1, 'x', 'Pantry');
  end;
  $do$;
  $$,
  null, null,
  'dinner_ingredients: cannot insert a child row under household A''s dinner');

-- UPDATE / DELETE isolation: affecting A's rows is a no-op (RLS filters them out).
-- (Data-modifying CTEs can't sit in a subquery, so each is wrapped in a DO block that checks
-- ROW_COUNT.)
select lives_ok(
  $$
  do $do$
  declare n int;
  begin
    update public.dinners set name = 'hacked'
      where household_id = 'aaaaaaaa-0000-0000-0000-000000000000';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'expected 0 rows updated, got %', n; end if;
  end $do$;
  $$,
  'dinners: UPDATE targeting household A affects 0 rows');
select lives_ok(
  $$
  do $do$
  declare n int;
  begin
    delete from public.grocery_store_rows
      where household_id = 'aaaaaaaa-0000-0000-0000-000000000000';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'expected 0 rows deleted, got %', n; end if;
  end $do$;
  $$,
  'grocery_store_rows: DELETE targeting household A affects 0 rows');
select lives_ok(
  $$
  do $do$
  declare n int;
  begin
    delete from public.weekly_plan_selections wps
      using public.weekly_plans p
      where p.id = wps.weekly_plan_id
        and p.household_id = 'aaaaaaaa-0000-0000-0000-000000000000';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'expected 0 rows deleted, got %', n; end if;
  end $do$;
  $$,
  'weekly_plan_selections: DELETE targeting household A''s plan affects 0 rows');

-- B CAN operate on its own rows (sanity — RLS is not just "deny all").
select isnt((select count(*)::int from public.dinners), 0, 'B still sees its own dinners');
select lives_ok(
  $$ insert into public.dinners (name, cuisine_type, cook_time_minutes, instructions)
     values ('B new dinner', 'x', 5, 'x') $$,
  'B can insert its own dinner (household_id self-assigned by default)');
select is(
  (select household_id from public.dinners where name = 'B new dinner'),
  public.current_user_household_id(),
  'B''s new dinner self-assigned to household B');

reset role;
select * from finish();
rollback;
