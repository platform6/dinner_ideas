-- Weekly Planning: concurrency fixes (intent 001-weekly-dinner-planner, unit 002-weekly-planning)
-- Found during code review of the initial commit — see git history for the review findings.
-- Additive migration — does not edit 20260826192038_weekly_planning_schema.sql.
--
-- Fixes three related races, all stemming from the same root cause (check-then-act
-- without a lock, per ADR-1's "the database is the only place these invariants can be
-- reliably guaranteed"):
--
-- 1. Two concurrent inserts against a plan with 2 selections could both pass the
--    "< 3" check before either commits, landing the plan at 4 selections.
-- 2. A concurrent lock_weekly_plan and a selection DELETE didn't serialize against
--    each other, so a plan could end up locked with only 2 selections.
-- 3. Two concurrent lock_weekly_plan calls on the same plan could both read
--    locked_at as null and both proceed, so the second hit the
--    block-edit-after-lock trigger and threw instead of returning the documented
--    idempotent no-op.
--
-- Fix for 1 & 2: fn_weekly_plan_selections_guard now takes a row lock on the parent
-- weekly_plans row (SELECT ... FOR UPDATE) before its checks. Since lock_weekly_plan's
-- UPDATE on that same row also participates in Postgres's normal row locking, this
-- serializes selection inserts/deletes against a concurrent lock attempt too.
--
-- Fix for 3: lock_weekly_plan takes the same FOR UPDATE lock before reading locked_at,
-- so a second concurrent call blocks until the first commits, then re-reads the
-- now-current locked_at and correctly takes the idempotent no-op path.

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

  -- Serializes concurrent writers against this plan (including a concurrent
  -- lock_weekly_plan call, which updates this same row) before the checks below run.
  perform 1 from public.weekly_plans where id = v_plan_id for update;

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

create or replace function public.lock_weekly_plan(p_plan_id uuid)
returns public.weekly_plans
language plpgsql
as $$
declare
  v_plan public.weekly_plans;
begin
  select * into v_plan from public.weekly_plans where id = p_plan_id for update;

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

comment on function public.lock_weekly_plan(uuid) is 'Atomically locks a weekly plan (requires exactly 3 selections, enforced by trg_weekly_plans_require_three_on_lock). Idempotent: returns the plan unchanged if already locked, even under concurrent calls (see this migration''s FOR UPDATE lock).';

-- Fix for the orphan-plan race: two concurrent "no current unlocked plan" reads on the
-- client could both call createPlan(), producing two unlocked plans — only the newer one
-- is ever shown again (fetchCurrentPlan orders by created_at desc limit 1), silently
-- dropping the first pick. This index makes "at most one unlocked plan at a time" a real
-- DB invariant: a second concurrent create now fails loudly (unique violation) instead of
-- silently succeeding and orphaning data.
create unique index if not exists idx_weekly_plans_one_unlocked
  on public.weekly_plans ((true))
  where locked_at is null;

comment on index public.idx_weekly_plans_one_unlocked is 'At most one unlocked (draft) weekly plan may exist at a time. Locked plans are historical and exempt.';
