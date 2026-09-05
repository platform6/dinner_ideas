-- ═══════════════════════════════════════════════════════════════════════════════
-- ⚠️  NOT A LIVE MIGRATION — DO NOT MOVE INTO supabase/migrations/ YET
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Migration B of intent 010's cutover: retire the old Rows/Assignments model.
-- (intent 010-grocery-store-location-model, unit 001-location-item-model, bolt 051)
-- Story: 007-cutover-migration (its "documented follow-up" clause). See ADR-9.
--
-- This file lives in the memory-bank ON PURPOSE. `supabase/migrations/` has no "pending"
-- state — it is the queue. A migration placed there "for later" runs on the next
-- `supabase db reset` or deploy, in whichever environment resets first. Keeping it here makes
-- it version-controlled, reviewable, and adjacent to its reasoning, while remaining inert.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY IT IS NOT LANDED YET
-- ─────────────────────────────────────────────────────────────────────────────
-- `src/features/store-config/types.ts` resolves:
--     Database['public']['Tables']['grocery_store_rows']['Row']
-- `database.types.ts` is generated from the live schema, so the moment these tables are
-- dropped and types are regenerated, that index type has nothing to resolve to. This is a
-- COMPILE error, not a runtime one: `tsc -b` fails, `pnpm build` fails, and no deploy can go
-- out at all — including deploys of entirely unrelated work. The blast radius is not "the
-- store page is blank"; it is "the project cannot ship anything."
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PRECONDITIONS — every box must be ticked before landing this
-- ─────────────────────────────────────────────────────────────────────────────
--   [ ] Unit 002 (store-config page) reads `locations` / `category_placements` /
--       `item_placements` and the `item_location_resolution` view — not the old tables.
--   [ ] Unit 003 (shopping-list ordering) sorts by the resolution view, not by
--       `category_row_assignments`.
--   [ ] No reference to `grocery_store_rows`, `category_row_assignments`, or
--       `reorder_grocery_store_row` remains anywhere in `src/`. Verify with:
--           grep -rn "grocery_store_rows\|category_row_assignments\|reorder_grocery_store_row" src/
--       (expect matches in `database.types.ts` only — that file regenerates after this runs.)
--   [ ] `20260904190000_location_item_model_cutover.sql` has been applied to production and
--       its step-5 equivalence check passed there (it aborts the transaction if not).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- HOW TO LAND IT
-- ─────────────────────────────────────────────────────────────────────────────
--   1. Confirm every precondition above.
--   2. `git mv` this file to `supabase/migrations/<current-timestamp>_retire_old_store_model.sql`
--      and delete this header block down to the `begin` marker below.
--   3. Delete the old feature code:  src/features/store-config/api.ts (the row/assignment
--      functions), types.ts's two aliases, and api.test.ts's coverage of them.
--   4. Delete the pgTAP files whose subject no longer exists:
--        supabase/tests/database/grocery_store_config_test.sql
--        supabase/tests/database/grocery_store_config_defaults_test.sql
--   5. `supabase db reset` && `supabase test db` && `npx tsc -b` — all must pass.
--   6. Regenerate `src/shared/lib/database.types.ts`.
--
-- NOTE: `reorder_grocery_store_row` has a latent bug (raises 23505 on any upward move of 2+
-- positions — see bolt 050's test report). It is dropped here rather than fixed, which is the
-- intended resolution. If this retirement is delayed indefinitely, revisit that decision.
--
-- ROLLBACK: none. This is the only irreversible step in intent 010. The data was carried
-- across by migration A; these tables hold nothing that is not already in `locations` and
-- `category_placements`.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── migration begins here ────────────────────────────────────────────────────

-- Final safety net: refuse to drop if migration A never carried the data across. Cheap, and it
-- turns "the tables are empty now" into a question asked before the drop rather than after.
do $$
declare
  v_old_rows integer;
  v_new_rows integer;
begin
  select count(*) into v_old_rows from public.grocery_store_rows;
  select count(*) into v_new_rows from public.locations;

  if v_old_rows > 0 and v_new_rows = 0 then
    raise exception
      'Retirement aborted: % grocery_store_rows exist but locations is empty — '
      'migration A (20260904190000_location_item_model_cutover.sql) has not run.', v_old_rows;
  end if;
end $$;

-- category_row_assignments first: it FKs to grocery_store_rows.
drop table if exists public.category_row_assignments;
drop table if exists public.grocery_store_rows;

-- The reorder RPC returns `setof public.grocery_store_rows`, so it must go with the table.
-- Superseded by public.reorder_location(uuid, integer) from bolt 050.
drop function if exists public.reorder_grocery_store_row(uuid, integer);
