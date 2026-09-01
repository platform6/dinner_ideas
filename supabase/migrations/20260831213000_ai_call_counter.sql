-- Daily-call cap: an atomic per-household / per-UTC-day counter for claude-proxy.
-- (intent 008-claude-proxy-review-remediation, unit 001-claude-proxy-hardening, bolt 040; story 002)
-- See memory-bank/bolts/040-claude-proxy-hardening/implementation-plan.md.
--
-- WHY: intent 007 enforced the daily cap by `select count(*) from ai_usage_log ... < limit`
-- and inserted the usage row much later. That is NOT atomic under READ COMMITTED, so
-- concurrent requests all read the same count and all passed (review finding 6); and every
-- logged row counted, so a flood of invalid requests consumed the cap (finding 5). This
-- replaces the live count with a single atomic upsert against a dedicated counter row.
-- ai_usage_log stays append-only and is now purely an audit trail.
--
-- Additive migration — edits nothing.
--
-- ROLLBACK:
--   drop function if exists public.reserve_ai_call(uuid, integer);
--   drop table if exists public.ai_call_counter;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ai_call_counter — one row per household per UTC day
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.ai_call_counter (
  household_id uuid not null references public.households(id) on delete cascade,
  day          date not null,
  n            integer not null default 0,
  primary key (household_id, day),
  constraint ai_call_counter_n_nonneg check (n >= 0)
);

comment on table public.ai_call_counter is
  'One row per household per UTC day. n = Claude calls reserved that day. Bumped atomically by '
  'reserve_ai_call() immediately before each upstream attempt; the per-household daily cap is '
  'enforced here, not by counting ai_usage_log. Rows for past days are inert (prune later if '
  'the table ever grows enough to matter).';

-- Clients never write this table (parity with ai_usage_log).
revoke insert, update, delete on public.ai_call_counter from authenticated, anon;

alter table public.ai_call_counter enable row level security;

-- Members may read their own household's counter (useful for a future "calls left today"
-- display, and for debugging). No write policy — all writes go through reserve_ai_call().
create policy "member reads household ai call counter"
  on public.ai_call_counter for select to authenticated
  using (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. reserve_ai_call — atomically claim one call slot for today
-- ═══════════════════════════════════════════════════════════════════════════════
-- Returns the new count (1..p_limit) on success, or NULL when the household is at/over
-- p_limit for the current UTC day. The INSERT ... ON CONFLICT DO UPDATE row-locks the
-- (household_id, day) row, so concurrent callers serialise on it. When p_limit < 1 the
-- SELECT yields no row, so nothing is inserted and NULL is returned.
create or replace function public.reserve_ai_call(p_household_id uuid, p_limit integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_call_counter (household_id, day, n)
  select p_household_id, (now() at time zone 'utc')::date, 1
  where p_limit >= 1
  on conflict (household_id, day) do update
    set n = public.ai_call_counter.n + 1
    where public.ai_call_counter.n < p_limit
  returning n;
$$;

comment on function public.reserve_ai_call(uuid, integer) is
  'service_role only — atomically reserve one Claude call for the household today. Returns the '
  'new count, or NULL at/over p_limit. Called by the claude-proxy Edge Function with a '
  'server-derived household id and the household''s effective daily_call_limit.';

-- Postgres grants EXECUTE to PUBLIC by default, and Supabase also grants it to
-- anon/authenticated — revoke from all of those before the targeted grant.
revoke execute on function public.reserve_ai_call(uuid, integer) from public, anon, authenticated;
grant  execute on function public.reserve_ai_call(uuid, integer) to service_role;
