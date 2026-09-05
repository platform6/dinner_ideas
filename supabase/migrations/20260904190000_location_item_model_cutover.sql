-- Location/Item Model Cutover — carry the Rows/Assignments model into Store -> Location -> Item
-- (intent 010-grocery-store-location-model, unit 001-location-item-model, bolt 051)
-- Story: 007-cutover-migration
-- See memory-bank/bolts/051-location-item-model/ddd-02-technical-design.md
--     and adr-009-deferred-destructive-retirement.md.
--
-- ⚠️ THIS MIGRATION IS PURELY ADDITIVE. It creates rows in bolt 050's tables and touches
-- nothing the running app reads. `grocery_store_rows` and `category_row_assignments` are left
-- in place ON PURPOSE — the live store-config page still reads them, and dropping them would
-- break `tsc -b` (src/features/store-config/types.ts indexes into the generated Database type),
-- blocking every deploy, not just the store page. Retirement is a written, ready-to-run
-- follow-up held OUTSIDE supabase/migrations/ at:
--     memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql
-- Land it only when its stated preconditions hold. See ADR-9.
--
-- Every step is idempotent (`where not exists` / `on conflict do nothing`), so a re-run and
-- `supabase db reset` are no-ops. The whole file is one transaction: if the equivalence check
-- in step 5 fails, steps 1-4 roll back and the database is exactly as it was.
--
-- ROLLBACK: delete from public.category_placements; delete from public.locations;
-- delete from public.items; delete from public.stores;  (nothing else was modified — no
-- item_placements or suggestion_dismissals are created here, and no pre-existing row is
-- updated or deleted.)

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 0. Guard: every assigned category must be writable into category_placements
-- ═══════════════════════════════════════════════════════════════════════════════
-- category_placements.category carries dinner_ingredients.category's CHECK (5 values), while
-- category_row_assignments.category is free text with no check. An assignment naming anything
-- outside that set would fail step 3 with a bare 23514 mid-migration; silently skipping it
-- would make a user's configuration vanish with no signal. Report instead of guessing.
do $$
declare
  v_bad text;
begin
  select string_agg(distinct a.category, ', ' order by a.category) into v_bad
  from public.category_row_assignments a
  where a.category not in ('Produce', 'Protein', 'Dairy', 'Grains', 'Pantry');

  if v_bad is not null then
    raise exception
      'Cutover aborted: category_row_assignments contains categories outside the '
      'dinner_ingredients CHECK set: %. Widen the check or clean the data, then re-run.', v_bad;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 1. Seed exactly one active Store per household (FR-1)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Total: every household gets one, INCLUDING a household with no rows at all — it gets an
-- empty Store and unit 002's first-run state. Idempotent against bolt 050's partial unique
-- index `stores_one_active_per_household`.
insert into public.stores (household_id, name, is_active)
select h.id, 'My Store', true
from public.households h
where not exists (
  select 1 from public.stores s
  where s.household_id = h.id and s.is_active
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 2. Carry the walking path across: grocery_store_rows -> locations (FR-2, FR-10)
-- ═══════════════════════════════════════════════════════════════════════════════
-- `name` and `position` verbatim; `type` inferred. The old table's own
-- unique (household_id, position) guarantees the new unique (store_id, position) by
-- construction — no renumbering, no collisions.
--
-- The type heuristic is one-time and lossy BY DESIGN: `section` is the safe default because it
-- makes no numeric claim, and the result is user-editable in unit 002, so a wrong guess costs
-- one tap and destroys nothing. (Verified against live data: all five seeded default rows —
-- Dairy, Grains, Pantry, Produce, Protein — correctly infer as `section`.)
insert into public.locations (household_id, store_id, name, type, position)
select r.household_id,
       s.id,
       r.name,
       case when r.name ~* '^\s*aisle\s+\d+' then 'aisle' else 'section' end,
       r.position
from public.grocery_store_rows r
join public.stores s
  on s.household_id = r.household_id and s.is_active
where not exists (
  select 1 from public.locations l
  where l.store_id = s.id and l.position = r.position
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 3. Carry category placements across (FR-5, FR-10)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Joined through ROW IDENTITY (category_row_assignments.row_id -> grocery_store_rows.id), then
-- onto the carried-across location by (store_id, position) — which step 2 preserved exactly.
-- Never joined by name: two rows may share a name, and name is not identity.
insert into public.category_placements (household_id, store_id, category, location_id)
select a.household_id, s.id, a.category, l.id
from public.category_row_assignments a
join public.grocery_store_rows r
  on r.id = a.row_id
join public.stores s
  on s.household_id = a.household_id and s.is_active
join public.locations l
  on l.store_id = s.id and l.position = r.position
on conflict (store_id, category) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 4. Backfill the Items registry (FR-3, FR-10)
-- ═══════════════════════════════════════════════════════════════════════════════
-- One Item per distinct normalized name per household, for every ingredient that predates
-- bolt 050's trigger. Uses the SAME `on conflict` target as the trigger, so the backfill and
-- the trigger cannot disagree about identity — the property ADR-7 depends on.
--
-- `distinct on` collapses same-household case/whitespace variants before they reach the
-- conflict handler; the ORDER BY makes which variant's casing survives deterministic
-- (alphabetically first) rather than arbitrary.
--
-- ZERO item_placements are created. Not an omission — a rule. The old model had no
-- per-ingredient placement, so there is nothing to carry, and inventing one would fabricate a
-- user decision that was never made. Day one resolves entirely through category inheritance,
-- which is exactly what the old model did.
insert into public.items (household_id, name)
select distinct on (d.household_id, lower(btrim(di.name)))
       d.household_id,
       btrim(di.name)
from public.dinner_ingredients di
join public.dinners d
  on d.id = di.dinner_id
where btrim(di.name) <> ''
order by d.household_id, lower(btrim(di.name)), btrim(di.name)
on conflict (household_id, name_key) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 5. Verify equivalence against the old model, or abort (FR-10's no-regression bar)
-- ═══════════════════════════════════════════════════════════════════════════════
-- The bolt's whole reason to be careful: the same shopping list must sort the same way after
-- the cutover as before, for the same data, using none of the same tables to do it.
--
-- Because step 4 creates zero item_placements, resolution reduces to the category level, so
-- equivalence is provable as a set comparison rather than a per-ingredient walk:
--
--   old: dinner_ingredients.category -> category_row_assignments -> grocery_store_rows.position
--   new: dinner_ingredients.category -> category_placements      -> locations.position
--
-- FULL OUTER JOIN is deliberate. An INNER JOIN would pass while silently dropping an entire
-- category; this catches a missing row, an extra row, and a wrong position with one predicate.
--
-- This runs against REAL data at cutover time and aborts the transaction on any mismatch —
-- the ADR-3 "abort loudly rather than guess" pattern. It is only possible because retirement
-- is deferred (ADR-9): dropping the old tables here would destroy the baseline in the same
-- transaction that needs it.
do $$
declare
  v_mismatch text;
begin
  with old_order as (
    select a.household_id, a.category, r.position
    from public.category_row_assignments a
    join public.grocery_store_rows r on r.id = a.row_id
  ),
  new_order as (
    select cp.household_id, cp.category, l.position
    from public.category_placements cp
    join public.locations l on l.id = cp.location_id
  )
  select string_agg(
           format('household %s / %s: old=%s new=%s',
                  coalesce(o.household_id, n.household_id),
                  coalesce(o.category, n.category),
                  coalesce(o.position::text, '<missing>'),
                  coalesce(n.position::text, '<missing>')),
           '; ')
    into v_mismatch
  from old_order o
  full outer join new_order n
    on n.household_id = o.household_id
   and n.category = o.category
  where o.position is distinct from n.position;

  if v_mismatch is not null then
    raise exception
      'Cutover aborted — resolved order is NOT equivalent to the old model: %', v_mismatch;
  end if;
end $$;
