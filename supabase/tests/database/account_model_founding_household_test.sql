-- pgTAP tests for the founding-household cutover (bolt 030-household-data-model; story 008)
-- Run locally via: supabase test db
--
-- These assert the POST-migration state. By the time this runs, `supabase db reset` has applied
-- migration 20260828234000, which (in a fresh local/CI DB with no auth users) bootstrapped a
-- synthetic founding user and stamped every shipped seed row with the founding household id.

begin;
select plan(19);

-- ── exactly one founding household, owned by the designated user ────────────
select is(
  (select count(*)::int from public.households
   where id = '00000000-0000-4000-8000-000000000001'),
  1, 'the founding household row exists (fixed UUID)');

select is(
  (select hm.role
   from public.household_members hm
   join auth.users u on u.id = hm.profile_id
   where hm.household_id = '00000000-0000-4000-8000-000000000001'
     and lower(u.email) = 'platform.six@gmail.com'),
  'owner', 'the founding user is an owner of the founding household');

select is(
  (select count(*)::int from public.household_members
   where household_id = '00000000-0000-4000-8000-000000000001'),
  1, 'the founding household has exactly one member (the owner)');

-- ── zero null household_id anywhere ────────────────────────────────────────
select is((select count(*)::int from public.dinners where household_id is null), 0,
  'dinners: no null household_id');
select is((select count(*)::int from public.tags where household_id is null), 0,
  'tags: no null household_id');
select is((select count(*)::int from public.grocery_store_rows where household_id is null), 0,
  'grocery_store_rows: no null household_id');
select is((select count(*)::int from public.category_row_assignments where household_id is null), 0,
  'category_row_assignments: no null household_id');
select is((select count(*)::int from public.weekly_plans where household_id is null), 0,
  'weekly_plans: no null household_id');
select is((select count(*)::int from public.meal_history where household_id is null), 0,
  'meal_history: no null household_id');

-- child tables inherit via a non-null parent
select is(
  (select count(*)::int from public.dinner_ingredients di
   left join public.dinners d on d.id = di.dinner_id
   where d.household_id is null),
  0, 'dinner_ingredients: every row has a parent dinner with a non-null household_id');
select is(
  (select count(*)::int from public.weekly_plan_selections wps
   left join public.weekly_plans p on p.id = wps.weekly_plan_id
   where p.household_id is null),
  0, 'weekly_plan_selections: every row has a parent plan with a non-null household_id');

-- ── columns are NOT NULL ──────────────────────────────────────────────────
select col_not_null('public', 'dinners', 'household_id', 'dinners.household_id is NOT NULL');
select col_not_null('public', 'tags', 'household_id', 'tags.household_id is NOT NULL');
select col_not_null('public', 'grocery_store_rows', 'household_id', 'grocery_store_rows.household_id is NOT NULL');
select col_not_null('public', 'category_row_assignments', 'household_id', 'category_row_assignments.household_id is NOT NULL');
select col_not_null('public', 'weekly_plans', 'household_id', 'weekly_plans.household_id is NOT NULL');
select col_not_null('public', 'meal_history', 'household_id', 'meal_history.household_id is NOT NULL');

-- ── category_row_assignments PK promoted to (household_id, category) ────────
select col_is_pk('public', 'category_row_assignments', array['household_id', 'category'],
  'category_row_assignments PK is (household_id, category)');

-- ── the shipped seed catalog survived and belongs to the founding household ─
select is(
  (select count(*)::int from public.dinners
   where household_id = '00000000-0000-4000-8000-000000000001'),
  50, 'all 50 shipped seed dinners belong to the founding household');

select * from finish();
rollback;
