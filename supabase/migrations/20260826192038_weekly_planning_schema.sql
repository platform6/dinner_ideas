-- Weekly Planning schema (intent 001-weekly-dinner-planner, unit 002-weekly-planning)
-- Stories: 001-weekly-plan-schema, 002-enforce-exactly-three-immutable, 003-last-chosen-query
-- See memory-bank/bolts/002-weekly-planning/ddd-02-technical-design.md and adr-001-db-enforced-domain-invariants.md

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.weekly_plans is 'One week''s dinner plan. Editable while locked_at is null; permanently immutable once locked.';
comment on column public.weekly_plans.locked_at is 'Set when the shopping list is copied (FR-3), not at initial selection. Once set, the row and its selections are immutable.';

create table if not exists public.weekly_plan_selections (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  dinner_id uuid not null references public.dinners(id),
  unique (weekly_plan_id, dinner_id)
);

comment on table public.weekly_plan_selections is 'One of up to 3 dinners currently chosen for a weekly plan.';
comment on constraint weekly_plan_selections_weekly_plan_id_dinner_id_key on public.weekly_plan_selections is 'Prevents picking the same dinner twice within one week''s 3 slots.';

-- Trigger: guard weekly_plan_selections writes (max 3, and block if parent plan is locked)
create or replace function public.fn_weekly_plan_selections_guard()
returns trigger
language plpgsql
as $$
declare
  v_plan_id uuid;
  v_locked_at timestamptz;
  v_selection_count integer;
begin
  if tg_op = 'DELETE' then
    v_plan_id := old.weekly_plan_id;
  else
    v_plan_id := new.weekly_plan_id;
  end if;

  select locked_at into v_locked_at from public.weekly_plans where id = v_plan_id;

  if v_locked_at is not null then
    raise exception 'cannot modify selections of a locked weekly plan (id: %)', v_plan_id;
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_selection_count
    from public.weekly_plan_selections
    where weekly_plan_id = v_plan_id;

    if v_selection_count >= 3 then
      raise exception 'weekly plan % already has 3 selections; remove one before adding another', v_plan_id;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_weekly_plan_selections_guard
  before insert or update or delete on public.weekly_plan_selections
  for each row execute function public.fn_weekly_plan_selections_guard();

-- Trigger: block any further update to a weekly_plans row once locked
create or replace function public.fn_weekly_plans_block_edit_after_lock()
returns trigger
language plpgsql
as $$
begin
  raise exception 'weekly plan % is locked and cannot be modified', old.id;
end;
$$;

create trigger trg_weekly_plans_block_edit_after_lock
  before update on public.weekly_plans
  for each row
  when (old.locked_at is not null)
  execute function public.fn_weekly_plans_block_edit_after_lock();

-- Trigger: require exactly 3 selections at the moment a plan transitions to locked
create or replace function public.fn_weekly_plans_require_three_on_lock()
returns trigger
language plpgsql
as $$
declare
  v_selection_count integer;
begin
  select count(*) into v_selection_count
  from public.weekly_plan_selections
  where weekly_plan_id = new.id;

  if v_selection_count != 3 then
    raise exception 'weekly plan % must have exactly 3 selections to lock (found %)', new.id, v_selection_count;
  end if;

  return new;
end;
$$;

create trigger trg_weekly_plans_require_three_on_lock
  before update on public.weekly_plans
  for each row
  when (old.locked_at is null and new.locked_at is not null)
  execute function public.fn_weekly_plans_require_three_on_lock();

-- RPC: atomic, idempotent lock action (called when the shopping list is copied)
create or replace function public.lock_weekly_plan(p_plan_id uuid)
returns public.weekly_plans
language plpgsql
as $$
declare
  v_plan public.weekly_plans;
begin
  select * into v_plan from public.weekly_plans where id = p_plan_id;

  if v_plan is null then
    raise exception 'weekly plan % not found', p_plan_id;
  end if;

  if v_plan.locked_at is not null then
    return v_plan; -- already locked: treat as a no-op success
  end if;

  update public.weekly_plans
  set locked_at = now()
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

comment on function public.lock_weekly_plan(uuid) is 'Atomically locks a weekly plan (requires exactly 3 selections, enforced by trg_weekly_plans_require_three_on_lock). Idempotent: returns the plan unchanged if already locked.';

-- View: last-chosen date per dinner, based on locked plans only
create or replace view public.dinner_last_chosen
with (security_invoker = true) as
select
  d.id as dinner_id,
  max(wp.start_date) as last_chosen_date
from public.dinners d
left join public.weekly_plan_selections wps on wps.dinner_id = d.id
left join public.weekly_plans wp on wp.id = wps.weekly_plan_id and wp.locked_at is not null
group by d.id;

comment on view public.dinner_last_chosen is 'Most recent locked-plan start_date per dinner (null = never chosen). Feeds FR-4 variety nudging.';

-- Row Level Security: single shared household login, same shape as 001-dinner-catalog.

alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_selections enable row level security;

create policy "Authenticated household can read weekly_plans"
  on public.weekly_plans for select
  to authenticated
  using (true);

create policy "Authenticated household can insert weekly_plans"
  on public.weekly_plans for insert
  to authenticated
  with check (true);

create policy "Authenticated household can update weekly_plans"
  on public.weekly_plans for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated household can read weekly_plan_selections"
  on public.weekly_plan_selections for select
  to authenticated
  using (true);

create policy "Authenticated household can insert weekly_plan_selections"
  on public.weekly_plan_selections for insert
  to authenticated
  with check (true);

create policy "Authenticated household can delete weekly_plan_selections"
  on public.weekly_plan_selections for delete
  to authenticated
  using (true);

grant execute on function public.lock_weekly_plan(uuid) to authenticated;
