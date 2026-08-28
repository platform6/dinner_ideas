-- Grocery Store Config: default rows + category assignments
-- (intent 001-weekly-dinner-planner, unit 004-grocery-store-config)
-- Story: 003-default-grocery-store-rows (FR-15, bolt 021-grocery-store-config)
-- See memory-bank/bolts/021-grocery-store-config/implementation-plan.md for rationale.
--
-- Additive migration — does not edit 20260827040000_grocery_store_config.sql.
--
-- One-time seed that REPLACES whatever store-row config the household currently has with a
-- known-good default, so the shopping list groups in store order with no setup. "Replace"
-- (not merge) was the user's explicit choice during Inception round 3. Any rows or category
-- assignments configured before this migration are discarded.
--
-- Safe to re-run: the delete-then-insert below is idempotent (positions 1..5 are unique and
-- contiguous; the assignment insert joins on row name, so it never depends on row UUIDs).

begin;

-- Clear existing config. Deleting rows would cascade to category_row_assignments anyway
-- (FK is ON DELETE CASCADE), but clearing assignments first is explicit about intent.
delete from public.category_row_assignments;
delete from public.grocery_store_rows;

-- 5 default rows, in the order the household walks the store.
insert into public.grocery_store_rows (name, position) values
  ('Dairy', 1),
  ('Grains', 2),
  ('Pantry', 3),
  ('Produce', 4),
  ('Protein', 5);

-- Map every ingredient category present in the seed data to the row of the same name.
-- Category strings match dinner_ingredients.category casing exactly (Dairy, Grains, Pantry,
-- Produce, Protein). A category absent from this table is simply unassigned and falls back
-- to alphabetical order after the configured rows (unchanged FR-12 behaviour).
insert into public.category_row_assignments (category, row_id)
select v.category, r.id
from (values ('Dairy'), ('Grains'), ('Pantry'), ('Produce'), ('Protein')) as v(category)
join public.grocery_store_rows r on r.name = v.category;

commit;
