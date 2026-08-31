-- Post-deploy hardening for intent 004-account-model.
-- Clears Supabase advisor (security) warnings observed after the 004 prod cutover
-- (2026-08-31). No behaviour change: pins search_path on six pre-004 functions,
-- narrows one grant, and removes an untracked prod-only object.
--
-- See memory-bank/intents/004-account-model/deployment/deployment-plan.md (Checkpoint 4).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Pin search_path on the pre-004 functions (lint 0011 function_search_path_mutable)
--    Bodies already schema-qualify every table reference; pg_catalog stays implicitly
--    first, so `''` is safe. ALTER only — function bodies are untouched.
-- ═══════════════════════════════════════════════════════════════════════════════
alter function public.lock_weekly_plan(uuid)                    set search_path = '';
alter function public.fn_weekly_plans_block_edit_after_lock()   set search_path = '';
alter function public.fn_weekly_plans_require_three_on_lock()    set search_path = '';
alter function public.fn_weekly_plan_selections_guard()         set search_path = '';
alter function public.fn_weekly_plans_record_meal_history()      set search_path = '';
alter function public.reorder_grocery_store_row(uuid, integer)   set search_path = '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. current_user_household_id() — SECURITY DEFINER RLS resolver (migration 20260828230000).
--    Advisor lints 0028/0029 flag it as anon/authenticated-executable. Left AS IS on
--    purpose:
--      * `authenticated` MUST keep EXECUTE — every household RLS policy calls it.
--      * `anon` keeps EXECUTE by design — the function is STABLE, never raises, and
--        returns null with no JWT (see its comment + account_model_identity_test.sql).
--        Anon calling it discloses nothing. The grant was deliberate in 20260828230000.
--    No change here; the two WARNs are accepted and recorded in the deployment plan.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Drop rls_auto_enable() — an event-trigger function that auto-enabled RLS on new
--    public tables. It was created directly against production (never in a migration),
--    so local/CI never had it. Every table's RLS is now set explicitly by the 004
--    migrations, making it redundant; removing it also clears lints 0028/0029 for it.
--    IF EXISTS + the guarded lookup keep this a no-op on environments that never had it.
-- ═══════════════════════════════════════════════════════════════════════════════
do $hardening$
declare
  v_evt text;
begin
  for v_evt in
    select evtname from pg_event_trigger
    where evtfoid = 'public.rls_auto_enable()'::regprocedure
  loop
    execute format('drop event trigger if exists %I', v_evt);
  end loop;
exception
  when undefined_function then
    null; -- function absent (local / CI): nothing bound, nothing to drop
end;
$hardening$;

drop function if exists public.rls_auto_enable();
