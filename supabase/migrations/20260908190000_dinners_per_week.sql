-- Dinners per week: make the selection count a household setting
-- (intent 015-dinners-per-week, unit 001-dinners-per-week-model, bolt 063)
-- Stories: 001-dinners-per-week-column, 002-selection-cap-honours-setting, 003-lock-honours-setting
-- See ddd-02-technical-design.md and adr-012-restate-set-search-path-when-replacing-a-function.md
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
-- ─────────────────────────────────────────────────────────────────────────────
-- "3 dinners a week" was never a preference; it was an invariant enforced by two triggers and
-- asserted in a function's name. This makes it `households.dinners_per_week`, defaulting to 3 so
-- nothing changes for a household that never touches the setting.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ THE TRAP — read before editing any function in this file (ADR-12)
-- ─────────────────────────────────────────────────────────────────────────────
-- `CREATE OR REPLACE FUNCTION` REPLACES the function's configuration parameters. A
-- `SET search_path` applied earlier by a separate `ALTER FUNCTION` is NOT preserved.
--
-- Verified empirically before writing this migration:
--     alter function __probe() set search_path = '';   -> pg_proc.proconfig = [1 entry]
--     create or replace function __probe() ...;        -> pg_proc.proconfig = [NULL]
--
-- Both functions below had search_path pinned by 20260831120000_advisor_hardening.sql, which
-- exists because intent 004's advisor run reported function_search_path_mutable six times.
-- Replacing them without restating the SET clause reverts that security fix, and nothing in the
-- function's own definition hints the property was attached elsewhere.
--
-- => Every CREATE OR REPLACE below restates `set search_path = ''`.
--    advisor_hardening_test.sql asserts proconfig on all six hardened functions and WILL catch a
--    lapse — verified by deliberately dropping the clause during this bolt's test stage, which
--    failed 'fn_weekly_plan_selections_guard search_path is pinned'. Renaming a hardened function
--    also means updating that file, or it aborts on a regprocedure cast.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK — safe now; conditional later
-- ─────────────────────────────────────────────────────────────────────────────
--   Restore the literal-3 bodies of both functions (from 20260827002830 and 20260826192038),
--   RESTATING `set search_path = ''` in each; drop trigger trg_weekly_plans_require_n_on_lock;
--   recreate trg_weekly_plans_require_three_on_lock on the restored function; drop
--   public.fn_weekly_plans_require_n_on_lock(); then:
--
--     alter table public.households drop column dinners_per_week;
--
--   THE COLUMN DROP IS ONLY SAFE UNTIL UNIT 002 SHIPS. Once client screens read
--   dinners_per_week, dropping it breaks them, and the rollback becomes functions-only — leaving
--   the column in place at its default. Check whether unit 002 is live before rolling back.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. The setting
-- ═════════════════════════════════════════════════════════════════════════════
-- Same shape as households.week_start_day (20260904020000): additive, check-constrained, and
-- needing NO new RLS — `households` already carries member-SELECT and owner-UPDATE from
-- 20260828230000, which cover a new column.

alter table public.households
  add column if not exists dinners_per_week smallint not null default 3
    check (dinners_per_week between 1 and 7);

comment on column public.households.dinners_per_week is
  'How many dinners this household plans per week. 1..7 (a week has seven days); default 3, which '
  'is what the app hard-coded before intent 015. Owner-editable on /settings. Enforced server-side '
  'by fn_weekly_plan_selections_guard (at most N) and fn_weekly_plans_require_n_on_lock (exactly N).';

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. The selection cap: "at most 3" becomes "at most N"
-- ═════════════════════════════════════════════════════════════════════════════
-- The `for update` on the PLAN row is unchanged and must stay. It is the fix from
-- 20260827002830: without it, two concurrent inserts could each read a count below the cap and
-- both commit, landing the plan at N+1.
--
-- The plan size is read by widening the SELECT that already ran for locked_at — no extra
-- statement — and it joins through the PLAN's household, not the caller's session, so the rule
-- follows the plan whoever is writing.
--
-- `households` deliberately takes NO lock of its own. A setting change racing an insert is not a
-- correctness problem in either direction:
--   * stale LOW  -> rejects an insert that would have been allowed. Benign; the user retries.
--   * stale HIGH -> allows a selection beyond the new setting, leaving a plan with more
--                   selections than its plan size. That state is ALREADY reachable and permitted
--                   (lowering the setting never deletes picks — see section 3), so no new
--                   inconsistency is introduced.
-- Serialising on the plan row is therefore sufficient.

create or replace function public.fn_weekly_plan_selections_guard()
returns trigger
language plpgsql
set search_path = ''                      -- ← ADR-12: restated, NOT inherited from 20260831120000
as $$
declare
  v_plan_id uuid;
  v_locked_at timestamptz;
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

  select wp.locked_at, h.dinners_per_week
    into v_locked_at, v_plan_size
  from public.weekly_plans wp
  join public.households h on h.id = wp.household_id
  where wp.id = v_plan_id;

  if v_locked_at is not null then
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

comment on function public.fn_weekly_plan_selections_guard() is
  'Rejects a selection beyond the household''s dinners_per_week, and any change to a locked plan. '
  'Serialises on the plan row (20260827002830) so concurrent inserts cannot both pass the count '
  'check. Reads the plan''s household, not the caller''s session.';

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. The lock guard: "exactly 3" becomes "exactly N", and the function is renamed
-- ═════════════════════════════════════════════════════════════════════════════
-- fn_weekly_plans_require_three_on_lock asserts "three" in its own name. After this change that
-- name is false, so it is renamed rather than left to mislead the next reader.
--
-- On the message: lowering dinners_per_week below a plan's current count leaves a plan that is
-- VALID but UNLOCKABLE. Nothing is deleted — the cap in section 2 bounds ADDING, and existing
-- rows are not retroactively illegal. But locking requires EXACTLY N, so it refuses for a reason
-- the user did not cause at lock time. The message therefore says what to do about it.

create or replace function public.fn_weekly_plans_require_n_on_lock()
returns trigger
language plpgsql
set search_path = ''                      -- ← ADR-12
as $$
declare
  v_plan_size smallint;
  v_selection_count integer;
begin
  select h.dinners_per_week into v_plan_size
  from public.households h
  where h.id = new.household_id;

  select count(*) into v_selection_count
  from public.weekly_plan_selections
  where weekly_plan_id = new.id;

  if v_selection_count != v_plan_size then
    if v_selection_count > v_plan_size then
      raise exception
        'weekly plan % has % selections but this household plans % per week; remove % before locking',
        new.id, v_selection_count, v_plan_size, v_selection_count - v_plan_size;
    else
      raise exception
        'weekly plan % must have exactly % selections to lock (found %)',
        new.id, v_plan_size, v_selection_count;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.fn_weekly_plans_require_n_on_lock() is
  'A plan locks only with exactly the household''s dinners_per_week selections. Replaces '
  'fn_weekly_plans_require_three_on_lock (intent 015), whose name asserted the constant this '
  'setting removed. Says how many picks to remove when the setting was lowered under an existing plan.';

-- Swap the trigger, then drop the old function. Order matters: a function cannot be dropped
-- while a trigger still depends on it.
drop trigger if exists trg_weekly_plans_require_three_on_lock on public.weekly_plans;

create trigger trg_weekly_plans_require_n_on_lock
  before update on public.weekly_plans
  for each row
  when (old.locked_at is null and new.locked_at is not null)
  execute function public.fn_weekly_plans_require_n_on_lock();

drop function if exists public.fn_weekly_plans_require_three_on_lock();

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Correct a comment that is now false
-- ═════════════════════════════════════════════════════════════════════════════
-- fn_weekly_plans_record_meal_history needs NO logic change — it already inserts one row per
-- selection via a SELECT, not three rows literally. Only its comment claimed "Writes 3
-- meal_history rows". Deliberately fixed with `comment on`, NOT `create or replace`: replacing it
-- would expose it to the ADR-12 trap for no reason.

comment on function public.fn_weekly_plans_record_meal_history() is
  'Writes one meal_history row per selection on the locked_at transition, each carrying the parent '
  'plan''s household_id (bolt 027). Count follows the household''s dinners_per_week; it was never '
  'hard-coded to 3, despite this comment previously saying so (corrected in intent 015). Runs AFTER '
  'trg_weekly_plans_require_n_on_lock.';
