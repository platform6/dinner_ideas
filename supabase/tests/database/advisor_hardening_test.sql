-- pgTAP tests for 20260831120000_advisor_hardening.sql
-- Run locally via: supabase test db

begin;
select plan(9);

-- ── search_path pinned on the six pre-004 functions ───────────────────────
-- proconfig element looks like `search_path=""`; match on the key, not the value.
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.lock_weekly_plan(uuid)'::regprocedure), ','
  ), '') like '%search_path=%',
  'lock_weekly_plan search_path is pinned');
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.fn_weekly_plans_block_edit_after_lock()'::regprocedure), ','
  ), '') like '%search_path=%',
  'fn_weekly_plans_block_edit_after_lock search_path is pinned');
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.fn_weekly_plans_require_three_on_lock()'::regprocedure), ','
  ), '') like '%search_path=%',
  'fn_weekly_plans_require_three_on_lock search_path is pinned');
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.fn_weekly_plan_selections_guard()'::regprocedure), ','
  ), '') like '%search_path=%',
  'fn_weekly_plan_selections_guard search_path is pinned');
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.fn_weekly_plans_record_meal_history()'::regprocedure), ','
  ), '') like '%search_path=%',
  'fn_weekly_plans_record_meal_history search_path is pinned');
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.reorder_grocery_store_row(uuid, integer)'::regprocedure), ','
  ), '') like '%search_path=%',
  'reorder_grocery_store_row search_path is pinned');

-- ── current_user_household_id() grants left intact on purpose ─────────────
select ok(
  has_function_privilege('authenticated', 'public.current_user_household_id()', 'execute'),
  'authenticated can execute current_user_household_id (RLS needs it)');
select ok(
  has_function_privilege('anon', 'public.current_user_household_id()', 'execute'),
  'anon retains execute on current_user_household_id (safe null resolver, by design)');

-- ── rls_auto_enable is gone (was prod-only; a no-op drop locally) ──────────
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'rls_auto_enable'),
  0, 'public.rls_auto_enable() does not exist');

select * from finish();
rollback;
