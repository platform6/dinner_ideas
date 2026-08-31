-- Claude integration: per-household AI config, usage metering, and Vault-backed key storage.
-- (intent 007-claude-integration, unit 001-claude-proxy-service, bolt 037; stories 001, 002)
-- See memory-bank/bolts/037-claude-proxy-service/ddd-02-technical-design.md
-- and adr-004-per-household-anthropic-key-in-vault.md.
--
-- Additive migration — edits nothing. Two tables + three security-definer functions.
--
-- ROLLBACK:
--   drop function if exists public.resolve_ai_key(uuid);
--   drop function if exists public.clear_household_ai_key();
--   drop function if exists public.set_household_ai_key(text);
--   drop table if exists public.ai_usage_log;
--   drop table if exists public.household_ai_config;
--   delete from vault.secrets where name like 'ai_key:%';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. household_ai_config — per-household, non-secret AI settings
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.household_ai_config (
  household_id     uuid primary key references public.households(id) on delete cascade,
  model_override   text,
  daily_call_limit integer not null default 25,
  key_secret_id    uuid,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles(id),
  constraint household_ai_config_daily_call_limit_nonneg
    check (daily_call_limit >= 0),
  constraint household_ai_config_model_override_allowed
    check (model_override is null
           or model_override in ('claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5'))
);

comment on table public.household_ai_config is
  'Per-household Claude settings. key_secret_id references a Supabase Vault secret '
  '(ai_key:{household_id}); null = no key set = Claude is off for the household. There is no '
  'shared/project key (intent 007, ADR-4).';
comment on column public.household_ai_config.key_secret_id is
  'Vault secret ref. Written ONLY by set_/clear_household_ai_key(); column-revoked from '
  'authenticated so an owner cannot repoint it at another household''s secret.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ai_usage_log — append-only, one row per claude-proxy call attempt
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.ai_usage_log (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  profile_id    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  feature       text not null,
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  est_cost_usd  numeric(10, 6),
  ok            boolean not null,
  error_code    text,
  latency_ms    integer
);

comment on table public.ai_usage_log is
  'Immutable audit: one row per claude-proxy call attempt (success or failure). Written only by '
  'the service-role Edge Function — no client insert/update/delete policy (cf. meal_history).';

create index if not exists idx_ai_usage_log_household_created
  on public.ai_usage_log (household_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Column + table privilege hardening (see ADR-4 "key-swap escalation")
--    Supabase grants ALL on new public tables to anon/authenticated by default, so a
--    per-column REVOKE is a no-op while the table-level grant stands. Drop the table-level
--    write grants and re-grant only the safe columns — key_secret_id is then writable ONLY
--    by the definer functions (which run as postgres).
-- ═══════════════════════════════════════════════════════════════════════════════
revoke insert, update, delete on public.household_ai_config from authenticated, anon;
grant  insert (household_id, model_override, daily_call_limit, updated_at, updated_by)
  on public.household_ai_config to authenticated;
grant  update (model_override, daily_call_limit, updated_at, updated_by)
  on public.household_ai_config to authenticated;
-- ai_usage_log: clients never write it (RLS also has no such policy — belt and suspenders).
revoke insert, update, delete on public.ai_usage_log from authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.household_ai_config enable row level security;
alter table public.ai_usage_log        enable row level security;

-- household_ai_config: any member reads; only an owner writes.
create policy "member reads household ai config"
  on public.household_ai_config for select to authenticated
  using (household_id = public.current_user_household_id());

create policy "owner inserts household ai config"
  on public.household_ai_config for insert to authenticated
  with check (
    household_id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members m
      where m.profile_id = (select auth.uid())
        and m.household_id = household_ai_config.household_id
        and m.role = 'owner'
    )
  );

create policy "owner updates household ai config"
  on public.household_ai_config for update to authenticated
  using (
    household_id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members m
      where m.profile_id = (select auth.uid())
        and m.household_id = household_ai_config.household_id
        and m.role = 'owner'
    )
  )
  with check (
    household_id = public.current_user_household_id()
    and exists (
      select 1 from public.household_members m
      where m.profile_id = (select auth.uid())
        and m.household_id = household_ai_config.household_id
        and m.role = 'owner'
    )
  );
-- (no DELETE policy on household_ai_config)

-- ai_usage_log: any member reads; no write policy at all.
create policy "member reads household ai usage log"
  on public.ai_usage_log for select to authenticated
  using (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Key vault functions (ADR-4). security definer, pinned search_path.
-- ═══════════════════════════════════════════════════════════════════════════════

-- OWNER: store or replace the caller's household Anthropic key. One transaction.
create or replace function public.set_household_ai_key(p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household  uuid := public.current_user_household_id();
  v_name       text;
  v_secret_id  uuid;
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
    raise exception 'only a household owner can manage the AI key' using errcode = '42501';
  end if;
  if p_key is null or length(btrim(p_key)) = 0 then
    raise exception 'api key must not be empty' using errcode = '22023';
  end if;

  v_name := 'ai_key:' || v_household::text;

  select key_secret_id into v_secret_id
  from public.household_ai_config where household_id = v_household;
  if v_secret_id is null then
    -- adopt any drifted secret with the deterministic name
    select id into v_secret_id from vault.secrets where name = v_name;
  end if;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_key, v_name, 'Anthropic API key for household ' || v_household::text);
  else
    perform vault.update_secret(v_secret_id, p_key);
  end if;

  insert into public.household_ai_config (household_id, key_secret_id, updated_by, updated_at)
  values (v_household, v_secret_id, (select auth.uid()), now())
  on conflict (household_id) do update
    set key_secret_id = excluded.key_secret_id,
        updated_by    = excluded.updated_by,
        updated_at    = excluded.updated_at;
end;
$$;

-- OWNER: remove the caller's household key. No-op success when none set.
create or replace function public.clear_household_ai_key()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.current_user_household_id();
  v_name      text;
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
    raise exception 'only a household owner can manage the AI key' using errcode = '42501';
  end if;

  v_name := 'ai_key:' || v_household::text;
  delete from vault.secrets where name = v_name;

  update public.household_ai_config
    set key_secret_id = null,
        updated_by    = (select auth.uid()),
        updated_at    = now()
    where household_id = v_household;
end;
$$;

-- SERVICE ROLE ONLY: decrypt the household's key, or null.
create or replace function public.resolve_ai_key(p_household_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from public.household_ai_config c
  join vault.decrypted_secrets ds on ds.id = c.key_secret_id
  where c.household_id = p_household_id
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and Supabase's default privileges also grant
-- it to anon/authenticated — revoke from all of those explicitly before the targeted grant.
revoke execute on function public.set_household_ai_key(text) from public, anon;
grant  execute on function public.set_household_ai_key(text) to authenticated;

revoke execute on function public.clear_household_ai_key()   from public, anon;
grant  execute on function public.clear_household_ai_key()   to authenticated;

revoke execute on function public.resolve_ai_key(uuid)       from public, anon, authenticated;
grant  execute on function public.resolve_ai_key(uuid)       to service_role;

comment on function public.set_household_ai_key(text) is
  'Owner-only. Stores/replaces the household Anthropic key in Vault (ai_key:{household_id}); '
  'writes only the opaque key_secret_id to household_ai_config. Never returns the key. (ADR-4)';
comment on function public.resolve_ai_key(uuid) is
  'service_role only — the single decrypt path for household Anthropic keys. Returns null when '
  'no key is set. Called by the claude-proxy Edge Function with a server-derived household id.';
