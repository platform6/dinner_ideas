-- household_ai_config: owner writes for model / daily-limit go through security-definer RPCs.
-- (intent 008-claude-proxy-review-remediation — post-deploy fix for FR-6 / bolt 042)
-- See memory-bank/intents/008-claude-proxy-review-remediation/deployment/deployment-plan.md.
--
-- WHY: `updateAiConfig` did a PostgREST `.upsert()` = INSERT ... ON CONFLICT DO UPDATE.
-- `household_ai_config` has COLUMN-level grants only for `authenticated` (no table-level
-- INSERT/UPDATE) so an owner cannot repoint `key_secret_id` (ADR-4); intent 008 then revoked
-- UPDATE(updated_at, updated_by) on top. On prod, PostgREST's ON CONFLICT DO UPDATE needs
-- table-level UPDATE privilege -> `42501 permission denied for table household_ai_config`
-- even for a household owner. (Key set/clear were never affected — they already use
-- security-definer RPCs.) This moves model / daily-limit writes to the same pattern:
-- two owner-checked `security definer` functions; the provenance trigger
-- (`stamp_household_ai_config_provenance`, 20260901000000) still stamps updated_by/updated_at.
--
-- ROLLBACK:
--   drop function if exists public.set_ai_model_override(text);
--   drop function if exists public.set_ai_daily_call_limit(integer);
--   -- and revert src/features/settings/api.ts to the .upsert() form + re-grant table UPDATE.

-- OWNER: set (or clear, with null) the household's model override.
create or replace function public.set_ai_model_override(p_model text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.current_user_household_id();
begin
  if v_household is null then
    raise exception 'no household for caller' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.household_members m
    where m.profile_id = (select auth.uid())
      and m.household_id = v_household
      and m.role = 'owner'
  ) then
    raise exception 'only a household owner can change AI settings' using errcode = '42501';
  end if;
  if p_model is not null
     and p_model not in ('claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5') then
    raise exception 'model must be one of: claude-sonnet-5, claude-haiku-4-5, claude-opus-5'
      using errcode = '22023';
  end if;

  insert into public.household_ai_config (household_id, model_override)
  values (v_household, p_model)
  on conflict (household_id) do update set model_override = excluded.model_override;
  -- updated_by / updated_at stamped by trg_household_ai_config_provenance
end;
$$;

comment on function public.set_ai_model_override(text) is
  'Owner-only. Sets household_ai_config.model_override for the caller''s household (null = use '
  'the server default). Resolves the household server-side; the client passes no id.';

-- OWNER: set the household's per-day Claude call cap.
create or replace function public.set_ai_daily_call_limit(p_limit integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.current_user_household_id();
begin
  if v_household is null then
    raise exception 'no household for caller' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.household_members m
    where m.profile_id = (select auth.uid())
      and m.household_id = v_household
      and m.role = 'owner'
  ) then
    raise exception 'only a household owner can change AI settings' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 0 then
    raise exception 'daily call limit must be a non-negative integer' using errcode = '22023';
  end if;

  insert into public.household_ai_config (household_id, daily_call_limit)
  values (v_household, p_limit)
  on conflict (household_id) do update set daily_call_limit = excluded.daily_call_limit;
  -- updated_by / updated_at stamped by trg_household_ai_config_provenance
end;
$$;

comment on function public.set_ai_daily_call_limit(integer) is
  'Owner-only. Sets household_ai_config.daily_call_limit for the caller''s household. '
  'Resolves the household server-side; the client passes no id.';

-- Postgres grants EXECUTE to PUBLIC by default; Supabase also to anon/authenticated —
-- revoke from those, then grant to authenticated only (mirrors set_household_ai_key).
revoke execute on function public.set_ai_model_override(text)     from public, anon;
grant  execute on function public.set_ai_model_override(text)     to authenticated;
revoke execute on function public.set_ai_daily_call_limit(integer) from public, anon;
grant  execute on function public.set_ai_daily_call_limit(integer) to authenticated;
