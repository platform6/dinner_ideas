-- household_ai_config: stamp updated_by / updated_at server-side.
-- (intent 008-claude-proxy-review-remediation, unit 002-settings-ai-remediation, bolt 042; story 002)
-- See memory-bank/bolts/042-settings-ai-remediation/implementation-plan.md.
--
-- WHY: intent 007's `updateAiConfig` client sent `updated_at: new Date().toISOString()` and
-- never set `updated_by`, so model / daily-limit edits trusted the browser clock and left
-- `updated_by` NULL — unlike `set_household_ai_key`, which records `auth.uid()`. This adds a
-- BEFORE INSERT OR UPDATE trigger that stamps both columns from the server, and revokes the
-- two columns from `authenticated` so the client cannot spoof them (same column-revoke
-- hardening as `key_secret_id` — ADR-4). The trigger is now the only writer of these columns.
--
-- ROLLBACK:
--   drop trigger if exists trg_household_ai_config_provenance on public.household_ai_config;
--   drop function if exists public.stamp_household_ai_config_provenance();
--   grant insert (updated_at, updated_by), update (updated_at, updated_by)
--     on public.household_ai_config to authenticated;

create or replace function public.stamp_household_ai_config_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() reads the request JWT claim, not the executing role, so this is the caller
  -- for a PostgREST write and NULL for a superuser / migration write (not a user edit).
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.stamp_household_ai_config_provenance() is
  'BEFORE INSERT OR UPDATE trigger on household_ai_config: stamps updated_by = auth.uid() and '
  'updated_at = now(), ignoring any client-provided values. The only writer of those columns.';

create trigger trg_household_ai_config_provenance
  before insert or update on public.household_ai_config
  for each row execute function public.stamp_household_ai_config_provenance();

-- The trigger owns these columns now — take the write grant away from clients too.
-- The security-definer key RPCs (set_/clear_household_ai_key) run as the table owner and are
-- unaffected; they set the same values the trigger would anyway.
revoke insert (updated_at, updated_by) on public.household_ai_config from authenticated;
revoke update (updated_at, updated_by) on public.household_ai_config from authenticated;
