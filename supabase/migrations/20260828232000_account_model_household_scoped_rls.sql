-- Account Model: rewrite all 35 domain RLS policies to household-scoped
-- (intent 004-account-model, unit 001-household-data-model)
-- Story: 004-household-scoped-rls
-- Bolt: 028-household-data-model
-- See memory-bank/bolts/028-household-data-model/ddd-02-technical-design.md.
--
-- Drops every `using (true)` / `with check (true)` policy on the 10 domain tables and recreates
-- them scoped to `household_id = public.current_user_household_id()` (direct tables) or an
-- `exists (... parent ...)` check (child tables). Grants (`to authenticated`) are unchanged.
-- meal_history stays insert-only (no update/delete policy) — immutability preserved.
--
-- Touches no table/column/function/grant/index. Must ship with bolts 026+027+029+030 in one push.
--
-- ROLLBACK: drop the 35 policies below and recreate the originals verbatim from migrations
-- 20260826175605 / 20260826192038 / 20260826224346 / 20260827020000 / 20260827030000 /
-- 20260827040000 (all of the form `... for <verb> to authenticated using (true) [with check (true)]`).

-- ═══════════════════════════════════════════════════════════════════════════════
-- dinners (direct)
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read dinners" on public.dinners;
drop policy if exists "Authenticated household can insert dinners" on public.dinners;
drop policy if exists "Authenticated household can update dinners" on public.dinners;
drop policy if exists "Authenticated household can delete dinners" on public.dinners;

create policy "dinners select in own household" on public.dinners
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "dinners insert in own household" on public.dinners
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "dinners update in own household" on public.dinners
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "dinners delete in own household" on public.dinners
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- dinner_ingredients (child -> dinners.dinner_id)
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read dinner_ingredients" on public.dinner_ingredients;
drop policy if exists "Authenticated household can insert dinner_ingredients" on public.dinner_ingredients;
drop policy if exists "Authenticated household can update dinner_ingredients" on public.dinner_ingredients;
drop policy if exists "Authenticated household can delete dinner_ingredients" on public.dinner_ingredients;

create policy "dinner_ingredients select via parent household" on public.dinner_ingredients
  for select to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_ingredients.dinner_id
                   and p.household_id = public.current_user_household_id()));
create policy "dinner_ingredients insert via parent household" on public.dinner_ingredients
  for insert to authenticated
  with check (exists (select 1 from public.dinners p
                      where p.id = public.dinner_ingredients.dinner_id
                        and p.household_id = public.current_user_household_id()));
create policy "dinner_ingredients update via parent household" on public.dinner_ingredients
  for update to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_ingredients.dinner_id
                   and p.household_id = public.current_user_household_id()))
  with check (exists (select 1 from public.dinners p
                      where p.id = public.dinner_ingredients.dinner_id
                        and p.household_id = public.current_user_household_id()));
create policy "dinner_ingredients delete via parent household" on public.dinner_ingredients
  for delete to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_ingredients.dinner_id
                   and p.household_id = public.current_user_household_id()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- dinner_steps (child -> dinners.dinner_id)
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read dinner_steps" on public.dinner_steps;
drop policy if exists "Authenticated household can insert dinner_steps" on public.dinner_steps;
drop policy if exists "Authenticated household can update dinner_steps" on public.dinner_steps;
drop policy if exists "Authenticated household can delete dinner_steps" on public.dinner_steps;

create policy "dinner_steps select via parent household" on public.dinner_steps
  for select to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_steps.dinner_id
                   and p.household_id = public.current_user_household_id()));
create policy "dinner_steps insert via parent household" on public.dinner_steps
  for insert to authenticated
  with check (exists (select 1 from public.dinners p
                      where p.id = public.dinner_steps.dinner_id
                        and p.household_id = public.current_user_household_id()));
create policy "dinner_steps update via parent household" on public.dinner_steps
  for update to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_steps.dinner_id
                   and p.household_id = public.current_user_household_id()))
  with check (exists (select 1 from public.dinners p
                      where p.id = public.dinner_steps.dinner_id
                        and p.household_id = public.current_user_household_id()));
create policy "dinner_steps delete via parent household" on public.dinner_steps
  for delete to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_steps.dinner_id
                   and p.household_id = public.current_user_household_id()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- tags (direct)
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read tags" on public.tags;
drop policy if exists "Authenticated household can insert tags" on public.tags;
drop policy if exists "Authenticated household can update tags" on public.tags;
drop policy if exists "Authenticated household can delete tags" on public.tags;

create policy "tags select in own household" on public.tags
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "tags insert in own household" on public.tags
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "tags update in own household" on public.tags
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "tags delete in own household" on public.tags
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- dinner_tags (child -> dinners.dinner_id)  [select / insert / delete]
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read dinner_tags" on public.dinner_tags;
drop policy if exists "Authenticated household can insert dinner_tags" on public.dinner_tags;
drop policy if exists "Authenticated household can delete dinner_tags" on public.dinner_tags;

create policy "dinner_tags select via parent household" on public.dinner_tags
  for select to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_tags.dinner_id
                   and p.household_id = public.current_user_household_id()));
create policy "dinner_tags insert via parent household" on public.dinner_tags
  for insert to authenticated
  with check (exists (select 1 from public.dinners p
                      where p.id = public.dinner_tags.dinner_id
                        and p.household_id = public.current_user_household_id()));
create policy "dinner_tags delete via parent household" on public.dinner_tags
  for delete to authenticated
  using (exists (select 1 from public.dinners p
                 where p.id = public.dinner_tags.dinner_id
                   and p.household_id = public.current_user_household_id()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- weekly_plans (direct)  [select / insert / update]
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read weekly_plans" on public.weekly_plans;
drop policy if exists "Authenticated household can insert weekly_plans" on public.weekly_plans;
drop policy if exists "Authenticated household can update weekly_plans" on public.weekly_plans;

create policy "weekly_plans select in own household" on public.weekly_plans
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "weekly_plans insert in own household" on public.weekly_plans
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "weekly_plans update in own household" on public.weekly_plans
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- weekly_plan_selections (child -> weekly_plans.weekly_plan_id)  [select / insert / delete]
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read weekly_plan_selections" on public.weekly_plan_selections;
drop policy if exists "Authenticated household can insert weekly_plan_selections" on public.weekly_plan_selections;
drop policy if exists "Authenticated household can delete weekly_plan_selections" on public.weekly_plan_selections;

create policy "weekly_plan_selections select via parent household" on public.weekly_plan_selections
  for select to authenticated
  using (exists (select 1 from public.weekly_plans p
                 where p.id = public.weekly_plan_selections.weekly_plan_id
                   and p.household_id = public.current_user_household_id()));
create policy "weekly_plan_selections insert via parent household" on public.weekly_plan_selections
  for insert to authenticated
  with check (exists (select 1 from public.weekly_plans p
                      where p.id = public.weekly_plan_selections.weekly_plan_id
                        and p.household_id = public.current_user_household_id()));
create policy "weekly_plan_selections delete via parent household" on public.weekly_plan_selections
  for delete to authenticated
  using (exists (select 1 from public.weekly_plans p
                 where p.id = public.weekly_plan_selections.weekly_plan_id
                   and p.household_id = public.current_user_household_id()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- meal_history (direct)  [select / insert ONLY — immutability preserved, ADR-2]
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read meal_history" on public.meal_history;
drop policy if exists "Authenticated household can insert meal_history" on public.meal_history;

create policy "meal_history select in own household" on public.meal_history
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "meal_history insert in own household" on public.meal_history
  for insert to authenticated
  with check (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- grocery_store_rows (direct)
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read grocery_store_rows" on public.grocery_store_rows;
drop policy if exists "Authenticated household can insert grocery_store_rows" on public.grocery_store_rows;
drop policy if exists "Authenticated household can update grocery_store_rows" on public.grocery_store_rows;
drop policy if exists "Authenticated household can delete grocery_store_rows" on public.grocery_store_rows;

create policy "grocery_store_rows select in own household" on public.grocery_store_rows
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "grocery_store_rows insert in own household" on public.grocery_store_rows
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "grocery_store_rows update in own household" on public.grocery_store_rows
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "grocery_store_rows delete in own household" on public.grocery_store_rows
  for delete to authenticated
  using (household_id = public.current_user_household_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- category_row_assignments (direct)
-- ═══════════════════════════════════════════════════════════════════════════════
drop policy if exists "Authenticated household can read category_row_assignments" on public.category_row_assignments;
drop policy if exists "Authenticated household can insert category_row_assignments" on public.category_row_assignments;
drop policy if exists "Authenticated household can update category_row_assignments" on public.category_row_assignments;
drop policy if exists "Authenticated household can delete category_row_assignments" on public.category_row_assignments;

create policy "category_row_assignments select in own household" on public.category_row_assignments
  for select to authenticated
  using (household_id = public.current_user_household_id());
create policy "category_row_assignments insert in own household" on public.category_row_assignments
  for insert to authenticated
  with check (household_id = public.current_user_household_id());
create policy "category_row_assignments update in own household" on public.category_row_assignments
  for update to authenticated
  using (household_id = public.current_user_household_id())
  with check (household_id = public.current_user_household_id());
create policy "category_row_assignments delete in own household" on public.category_row_assignments
  for delete to authenticated
  using (household_id = public.current_user_household_id());
