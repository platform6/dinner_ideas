-- Account Model: household_id on every domain table + constraint reworks + function scoping
-- (intent 004-account-model, unit 001-household-data-model)
-- Stories: 003-household-id-on-domain-tables, 009-scoping-existing-functions
-- Bolt: 027-household-data-model
-- See memory-bank/bolts/027-household-data-model/ddd-02-technical-design.md for the full
-- add-nullable -> backfill (bolt 030) -> set-not-null (bolt 030) staging rationale.
--
-- Additive migration. Adds a NULLABLE household_id to six parent tables (existing rows get null;
-- new rows self-assign via the default). Reworks four unique/PK constraints to be household-scoped
-- using `nulls not distinct` so today's global uniqueness still holds while every household_id is
-- null. Replaces two function bodies. Child tables (dinner_ingredients, dinner_steps, dinner_tags,
-- weekly_plan_selections) get NO column — their household is derived through the FK parent in
-- bolt 028's RLS.
--
-- Edits no shipped migration. Must be pushed together with bolts 026 + 028 + 029 + 030 — do not
-- deploy a partial subset (see the design doc's "deploy consequence" note).
--
-- Rollback (reverse order): restore fn_weekly_plans_record_meal_history / reorder_grocery_store_row
-- to their prior bodies (migrations 20260827030000 / 20260827040000); drop the new unique
-- constraints and restore tags_name_key / grocery_store_rows_position_key /
-- category_row_assignments_pkey; recreate idx_weekly_plans_one_unlocked on ((true));
-- drop column household_id from the six tables (indexes drop with them).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. household_id columns (nullable) + indexes on the six direct-column tables
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.dinners
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();
create index if not exists idx_dinners_household_id on public.dinners (household_id);

alter table public.tags
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();
create index if not exists idx_tags_household_id on public.tags (household_id);

alter table public.grocery_store_rows
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();
create index if not exists idx_grocery_store_rows_household_id on public.grocery_store_rows (household_id);

alter table public.category_row_assignments
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();
create index if not exists idx_category_row_assignments_household_id on public.category_row_assignments (household_id);

alter table public.weekly_plans
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();
create index if not exists idx_weekly_plans_household_id on public.weekly_plans (household_id);

alter table public.meal_history
  add column if not exists household_id uuid
  references public.households(id) on delete cascade
  default public.current_user_household_id();
create index if not exists idx_meal_history_household_id on public.meal_history (household_id);

comment on column public.dinners.household_id is
  'Owning household. NULLABLE until bolt 030 backfills the founding household and sets NOT NULL. '
  'New rows self-assign via default current_user_household_id().';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Constraint reworks — household-scoped, `nulls not distinct` for the null window
-- ═══════════════════════════════════════════════════════════════════════════════

-- dinners: unique (name) -> unique (household_id, name). A dinner name is unique WITHIN a
-- household, not globally — every household's seeded catalog reuses the same 50 names, and
-- seed_default_household_catalog() (bolt 029) inserts them per household.
alter table public.dinners drop constraint if exists dinners_name_key;
alter table public.dinners
  add constraint dinners_household_id_name_key
  unique nulls not distinct (household_id, name);

-- tags: unique (name) -> unique (household_id, name); keep the lowercase check.
alter table public.tags drop constraint if exists tags_name_key;
alter table public.tags
  add constraint tags_household_id_name_key
  unique nulls not distinct (household_id, name);

-- grocery_store_rows: unique (position) -> unique (household_id, position).
alter table public.grocery_store_rows drop constraint if exists grocery_store_rows_position_key;
alter table public.grocery_store_rows
  add constraint grocery_store_rows_household_id_position_key
  unique nulls not distinct (household_id, position);

-- category_row_assignments: PK (category) -> interim unique (household_id, category).
-- Bolt 030 promotes this to the real primary key once household_id is NOT NULL.
alter table public.category_row_assignments drop constraint if exists category_row_assignments_pkey;
alter table public.category_row_assignments alter column category set not null;
alter table public.category_row_assignments
  add constraint category_row_assignments_household_id_category_key
  unique nulls not distinct (household_id, category);

-- weekly_plans: "one unlocked plan globally" -> "one unlocked plan per household".
drop index if exists public.idx_weekly_plans_one_unlocked;
create unique index idx_weekly_plans_one_unlocked
  on public.weekly_plans (household_id) nulls not distinct
  where locked_at is null;
comment on index public.idx_weekly_plans_one_unlocked is
  'At most one unlocked (draft) weekly plan per household. During the null-household window '
  '(bolt 027 -> 030) `nulls not distinct` keeps it "one globally", matching prior behaviour.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Function scoping (story 009) — bodies only; trigger definitions unchanged
-- ═══════════════════════════════════════════════════════════════════════════════

-- 3a. meal-history trigger fn: stamp household_id from the locking plan.
create or replace function public.fn_weekly_plans_record_meal_history()
returns trigger
language plpgsql
as $$
begin
  insert into public.meal_history (weekly_plan_id, dinner_id, week_start_date, household_id)
  select new.id, wps.dinner_id, new.start_date, new.household_id
  from public.weekly_plan_selections wps
  where wps.weekly_plan_id = new.id
  on conflict (weekly_plan_id, dinner_id) do nothing;

  return new;
end;
$$;

comment on function public.fn_weekly_plans_record_meal_history() is
  'Writes 3 meal_history rows on the locked_at transition, each carrying the parent plan''s '
  'household_id (bolt 027). Runs AFTER trg_weekly_plans_require_three_on_lock.';

-- 3b. reorder RPC: scope the range check and every position shift to the row's household.
create or replace function public.reorder_grocery_store_row(p_row_id uuid, p_new_position integer)
returns setof public.grocery_store_rows
language plpgsql
as $$
declare
  v_old_position integer;
  v_household_id uuid;
  v_row_count integer;
begin
  -- FOR UPDATE serializes concurrent reorders; also yields the row's household.
  -- RLS already hides other households' rows, so a foreign p_row_id finds nothing here.
  select position, household_id
    into v_old_position, v_household_id
  from public.grocery_store_rows
  where id = p_row_id
  for update;

  if v_old_position is null then
    raise exception 'grocery store row % not found', p_row_id;
  end if;

  select count(*) into v_row_count
  from public.grocery_store_rows
  where household_id is not distinct from v_household_id;

  if p_new_position < 1 or p_new_position > v_row_count then
    raise exception 'position % out of range (1..%)', p_new_position, v_row_count;
  end if;

  if p_new_position = v_old_position then
    return query
      select * from public.grocery_store_rows
      where household_id is not distinct from v_household_id
      order by position;
    return;
  end if;

  update public.grocery_store_rows set position = -1 where id = p_row_id;

  if p_new_position > v_old_position then
    update public.grocery_store_rows
    set position = position - 1
    where household_id is not distinct from v_household_id
      and position > v_old_position
      and position <= p_new_position;
  else
    update public.grocery_store_rows
    set position = position + 1
    where household_id is not distinct from v_household_id
      and position >= p_new_position
      and position < v_old_position;
  end if;

  update public.grocery_store_rows set position = p_new_position where id = p_row_id;

  return query
    select * from public.grocery_store_rows
    where household_id is not distinct from v_household_id
    order by position;
end;
$$;

comment on function public.reorder_grocery_store_row(uuid, integer) is
  'Atomically moves a row to a new position, shifting every row between old and new — scoped to '
  'the target row''s household (bolt 027). FOR UPDATE serializes concurrent reorders. '
  '`is not distinct from` keeps it working during the null-household window.';

-- 3c. dinner_last_chosen: intentionally NOT modified. security_invoker = true + bolt 028 RLS on
--     dinners / weekly_plans / weekly_plan_selections makes it per-household automatically.
--     Verified by a two-household test case in weekly_planning_meal_history_test.sql.
