-- pgTAP tests for 20260831120000_advisor_hardening.sql
-- Run locally via: supabase test db

begin;
select plan(11);

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
-- Renamed by intent 015 (bolt 063): the old name asserted the constant that intent removed.
-- The pin must survive the rename — CREATE OR REPLACE discards a SET applied by ALTER, so the
-- new definition restates `set search_path = ''` itself (ADR-12). This assertion is what makes
-- that a caught mistake rather than a silent one.
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc where oid = 'public.fn_weekly_plans_require_n_on_lock()'::regprocedure), ','
  ), '') like '%search_path=%',
  'fn_weekly_plans_require_n_on_lock search_path is pinned (renamed from _require_three_ by intent 015)');
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

-- ── fn_create_dinner: pinned, and INVOKER on purpose (intent 014, ADR-13) ──
-- Added when the function landed, so this suite's guarantee covers every hardened function
-- rather than every one that existed when it was written.
select ok(
  coalesce(array_to_string(
    (select proconfig from pg_proc
     where oid = 'public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[])'::regprocedure), ','
  ), '') like '%search_path=%',
  'fn_create_dinner search_path is pinned');

-- prosecdef = false means SECURITY INVOKER. This is the assertion that catches someone
-- "fixing" it to definer for consistency with this schema's other 19 functions, which would
-- silently bypass the household-scoped RLS insert policies on all four tables it writes.
select is(
  (select prosecdef from pg_proc
   where oid = 'public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[])'::regprocedure),
  false, 'fn_create_dinner is SECURITY INVOKER, so RLS applies to its inserts');

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
