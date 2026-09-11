-- Remove a dinner: the catalog becomes correctable
-- (intent 018-serving-scale-and-removal, unit 003-remove-a-dinner, bolt 072)
-- Stories: 001-remove-a-dinner, 002-confirm-before-removing
-- See ddd-01-domain-model.md, ddd-02-technical-design.md,
--     adr-015-removing-a-dinner-removes-its-history.md
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY A FUNCTION, AND WHY THE FOREIGN KEYS ARE NOT TOUCHED
-- ─────────────────────────────────────────────────────────────────────────────
-- weekly_plan_selections.dinner_id and meal_history.dinner_id are plain REFERENCES dinners(id)
-- (ON DELETE NO ACTION, verified against the live schema at bolt 072 stage 4). So Postgres
-- refuses to delete any dinner that has ever been planned or cooked.
--
-- Making those two cascade would give EVERY delete of a dinner, from ANY path, now or later, the
-- power to erase history and edit plans, including this week's locked one, and a foreign key
-- cannot refuse one case. So they stay exactly as they are. A stray `delete from dinners` still
-- fails loudly; fn_remove_dinner is the one sanctioned path, and everything removal does is in it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT REMOVAL TAKES (ADR-15)
-- ─────────────────────────────────────────────────────────────────────────────
--   * the dinner, and (by the existing cascades) its ingredients, steps and tag links;
--   * its meal_history rows and every plan selection of it: past weeks' plans and this week's
--     draft. History's only reader is per dinner (dinner_last_chosen), so a removed dinner's
--     history has nothing left to feed; the dialog states the count before anything happens.
--   * NOT the shared tags (dinner_tags cascades the other way), and NOT items: the registry's sync
--     trigger fires on INSERT/UPDATE only (verified), and an item is store knowledge, not dinner data.
--
-- And the ONE thing it will not break: a dinner in a LOCKED plan whose week has not ended is
-- refused (P0001). A locked plan is immutable and holds exactly dinners_per_week; removing a dinner
-- from it mid-week breaks both and changes a shopping list someone may be using. The refusal lasts
-- only until the week rolls over. This narrows the product owner's "warn, don't refuse" (intent 018
-- Checkpoint 2) and is flagged for them to confirm.
--
-- "Week has not ended" = start_date + 7 > current_date. A plan covers seven days from its start,
-- whatever week_start_day is. current_date is UTC, so on a week's last day the boundary can be a few
-- hours off local midnight: refusing slightly too long, the safe direction.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. The selections guard gains ONE narrow escape
-- ═════════════════════════════════════════════════════════════════════════════
-- Verified at stage 4: this guard raises on ANY delete of a selection in a locked plan, including
-- every PAST week's plan, since locking is how history is written. Without an escape, removing any
-- dinner that was ever cooked would fail here.
--
-- The escape is as narrow as it can be made. ALL of these must hold:
--   * the operation is a DELETE (inserts and updates are never excused);
--   * app.dinner_removal = 'on', which only fn_remove_dinner sets, transaction-locally (set_config
--     with is_local = true). PostgREST clients cannot set arbitrary GUCs; this follows the
--     app.provisioning_disabled precedent in handle_new_user();
--   * the plan's week has ENDED. So even the sanctioned path cannot edit this week's locked plan:
--     a second guard behind fn_remove_dinner's own refusal, not the only one.
--
-- Everything else is restated unchanged: the `for update` serialisation (the 20260827002830 race
-- fix), the locked check, the dinners_per_week cap. ADR-12: `set search_path = ''` restated.
create or replace function public.fn_weekly_plan_selections_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_locked_at timestamptz;
  v_start_date date;
  v_plan_size smallint;
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

  select wp.locked_at, wp.start_date, h.dinners_per_week
    into v_locked_at, v_start_date, v_plan_size
  from public.weekly_plans wp
  join public.households h on h.id = wp.household_id
  where wp.id = v_plan_id;

  if v_locked_at is not null then
    -- The one sanctioned exception (bolt 072, ADR-15): fn_remove_dinner deleting a selection from
    -- a plan whose week has already ended. Never an insert or update; never this week's plan.
    if tg_op = 'DELETE'
       and coalesce(current_setting('app.dinner_removal', true), '') = 'on'
       and v_start_date + 7 <= current_date then
      return old;
    end if;
    raise exception 'cannot modify selections of a locked weekly plan (id: %)', v_plan_id;
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_selection_count
    from public.weekly_plan_selections
    where weekly_plan_id = v_plan_id;

    if v_selection_count >= v_plan_size then
      raise exception 'weekly plan % already has % selections; remove one before adding another',
        v_plan_id, v_plan_size;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. What a removal would take: read only, so the warning is built from facts
-- ═════════════════════════════════════════════════════════════════════════════
-- INVOKER: it only reads, and the existing SELECT policies already scope every count to the
-- caller's household. A dinner the caller cannot see raises P0002, exactly like a missing one.
create or replace function public.fn_dinner_removal_impact(p_dinner_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.dinners where id = p_dinner_id) then
    raise exception 'dinner not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'history_count',
      (select count(*) from public.meal_history where dinner_id = p_dinner_id),
    'past_plan_count',
      (select count(distinct wp.id)
         from public.weekly_plan_selections s
         join public.weekly_plans wp on wp.id = s.weekly_plan_id
        where s.dinner_id = p_dinner_id and wp.start_date + 7 <= current_date),
    'in_current_draft',
      exists (select 1
                from public.weekly_plan_selections s
                join public.weekly_plans wp on wp.id = s.weekly_plan_id
               where s.dinner_id = p_dinner_id
                 and wp.start_date + 7 > current_date and wp.locked_at is null),
    'in_current_locked_plan',
      exists (select 1
                from public.weekly_plan_selections s
                join public.weekly_plans wp on wp.id = s.weekly_plan_id
               where s.dinner_id = p_dinner_id
                 and wp.start_date + 7 > current_date and wp.locked_at is not null)
  );
end;
$$;

revoke execute on function public.fn_dinner_removal_impact(uuid) from public, anon;
grant execute on function public.fn_dinner_removal_impact(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. The removal itself: all of it, or none of it, or a refusal
-- ═════════════════════════════════════════════════════════════════════════════
-- ⚠ SECURITY DEFINER, deliberately, and unlike fn_create_dinner (ADR-13, invoker). Read ADR-15.
-- meal_history is trigger-owned: clients have INSERT and SELECT policies and NO delete policy
-- (verified at stage 4). Adding a client DELETE policy so an invoker function could work would let
-- any client delete history directly through PostgREST, skipping the warning and the refusal.
-- ADR-10: open a closed table for one purpose with a function that NAMES the exception.
--
-- Because it is definer, RLS does not apply inside it, so the household check is written here,
-- keyed off current_user_household_id(), the same helper every household policy uses. A dinner in
-- another household is indistinguishable from a missing one (P0002).
create or replace function public.fn_remove_dinner(p_dinner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid := public.current_user_household_id();
begin
  if v_household_id is null then
    raise exception 'dinner not found' using errcode = 'P0002';
  end if;

  -- Lock the dinner row: a concurrent removal or pick of this dinner waits rather than interleaves.
  perform 1 from public.dinners
   where id = p_dinner_id and household_id = v_household_id
   for update;
  if not found then
    raise exception 'dinner not found' using errcode = 'P0002';
  end if;

  -- The one refusal (ADR-15). Checked here, before anything is deleted: the client's warning is
  -- information, not the guard (ADR-1).
  if exists (select 1
               from public.weekly_plan_selections s
               join public.weekly_plans wp on wp.id = s.weekly_plan_id
              where s.dinner_id = p_dinner_id
                and wp.start_date + 7 > current_date and wp.locked_at is not null) then
    raise exception 'in_current_locked_plan'
      using errcode = 'P0001',
            hint = 'This dinner is in this week''s locked plan; it can be removed once the week is over.';
  end if;

  -- Transaction-local: excuses exactly the past-week selection deletes below, and nothing after
  -- this transaction ends.
  perform set_config('app.dinner_removal', 'on', true);

  delete from public.meal_history where dinner_id = p_dinner_id;
  delete from public.weekly_plan_selections where dinner_id = p_dinner_id;
  -- Ingredients, steps and tag links follow by the existing ON DELETE CASCADE.
  delete from public.dinners where id = p_dinner_id;

  perform set_config('app.dinner_removal', '', true);
end;
$$;

revoke execute on function public.fn_remove_dinner(uuid) from public, anon;
grant execute on function public.fn_remove_dinner(uuid) to authenticated;
