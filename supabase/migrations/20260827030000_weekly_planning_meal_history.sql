-- Weekly Planning: meal history (intent 001-weekly-dinner-planner, unit 002-weekly-planning)
-- Story: 004-meal-history-schema (FR-11, added post-deployment as bolt 010-weekly-planning)
-- See memory-bank/bolts/010-weekly-planning/ddd-02-technical-design.md and
-- adr-002-history-writes-belong-in-triggers.md for design rationale.
-- Additive migration — does not edit 20260826192038_weekly_planning_schema.sql or
-- 20260827002830_weekly_planning_concurrency_fixes.sql. lock_weekly_plan is untouched.

create table if not exists public.meal_history (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  dinner_id uuid not null references public.dinners(id),
  week_start_date date not null,
  unique (weekly_plan_id, dinner_id)
);

comment on table public.meal_history is 'Durable record of what was eaten each locked week (FR-11) — written by trg_weekly_plans_record_meal_history, not the client. Distinct from re-deriving "eaten" from weekly_plans.locked_at each time.';
comment on column public.meal_history.week_start_date is 'Denormalized copy of the parent plan''s start_date at lock time, for querying without a join.';

create index if not exists idx_meal_history_week_start_date on public.meal_history (week_start_date);
create index if not exists idx_meal_history_dinner_id on public.meal_history (dinner_id);

-- Trigger: write meal_history whenever a plan locks, regardless of which path causes the
-- locked_at transition (lock_weekly_plan, or a hypothetical direct client UPDATE — RLS permits
-- authenticated UPDATE on weekly_plans directly, not just via the RPC). See ADR-002: this must
-- live on the transition itself, not inside one particular RPC, for the same reason ADR-1's
-- validation triggers do.

create or replace function public.fn_weekly_plans_record_meal_history()
returns trigger
language plpgsql
as $$
begin
  insert into public.meal_history (weekly_plan_id, dinner_id, week_start_date)
  select new.id, wps.dinner_id, new.start_date
  from public.weekly_plan_selections wps
  where wps.weekly_plan_id = new.id
  on conflict (weekly_plan_id, dinner_id) do nothing;

  return new;
end;
$$;

comment on function public.fn_weekly_plans_record_meal_history() is 'Writes 3 meal_history rows on the locked_at transition. Runs AFTER trg_weekly_plans_require_three_on_lock, which already guarantees exactly 3 selections exist by the time this fires.';

create trigger trg_weekly_plans_record_meal_history
  after update on public.weekly_plans
  for each row
  when (old.locked_at is null and new.locked_at is not null)
  execute function public.fn_weekly_plans_record_meal_history();

-- Row Level Security: same shape as sibling tables — single shared household session, no
-- per-user roles. No UPDATE/DELETE policy is added deliberately: meal_history is immutable
-- once written (per the domain model), so omitting those policies enforces that by default
-- rather than needing an explicit block-edit trigger like weekly_plans has.

alter table public.meal_history enable row level security;

create policy "Authenticated household can read meal_history"
  on public.meal_history for select
  to authenticated
  using (true);

create policy "Authenticated household can insert meal_history"
  on public.meal_history for insert
  to authenticated
  with check (true);
