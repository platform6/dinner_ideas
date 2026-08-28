---
stage: test
bolt: 021-grocery-store-config
created: 2026-08-28T02:45:00Z
---

## Test Report: grocery-store-config (bolt 021)

### Summary

- **Live verification** against the linked "dinner ideas" Supabase project: all FR-15
  acceptance criteria pass.
- **New pgTAP suite**: `supabase/tests/database/grocery_store_config_defaults_test.sql`
  (5 assertions) — stands as a durable regression suite; `supabase test db` needs Docker,
  which is unavailable in this environment (same as `grocery_store_config_test.sql`).
- **Regression gate**: `npx tsc -b` ✅ · `npx eslint .` ✅ · `npx vitest run` ✅ 132/132
  (incl. `reorder.test.ts` 5/5) · `npx vite build` ✅. No application code changed.

### Test Files

- [x] `supabase/tests/database/grocery_store_config_defaults_test.sql` — **new**. Asserts:
      exactly 5 rows; rows are `Dairy,Grains,Pantry,Produce,Protein` at positions `1..5`; exactly
      5 category assignments; each assignment maps `<name>` → the row named `<name>`; no
      assignment points at a differently-named row.
- [x] `src/features/shopping-list/reorder.test.ts` — existing, re-run: 5/5 pass (unassigned
      categories still fall back to alphabetical after configured rows — FR-12 behaviour
      unregressed).

### Acceptance Criteria Validation

- ✅ **`grocery_store_rows` = exactly the 5 defaults at positions 1–5**: live query returned
  `Dairy(1), Grains(2), Pantry(3), Produce(4), Protein(5)`; prior config was cleared by the
  migration's `delete`.
- ✅ **`category_row_assignments` = 5, each name-matched**: live query returned 5 rows,
  `0 mismatched` (no `category <> row.name`).
- ✅ **Shopping list orders groups Dairy → Grains → Pantry → Produce → Protein**: ran a query
  reproducing `reorderGroupsByRows`'s ordering over the latest weekly plan's ingredient
  categories — result came back in exactly that order; every category in use is assigned
  (no fallback needed).
- ✅ **Unassigned categories still fall back to alphabetical after configured rows**:
  `reorder.test.ts` covers this and passes; live check showed no ingredient category
  currently in use is unassigned, so no live fallback case exists to break.
- ✅ **Migration is safe to re-run**: it is a `delete`-then-`insert`, and the assignment
  insert joins on row _name_ (not `gen_random_uuid()` id), so a second run reproduces the
  same 5 rows / 5 assignments.
- ✅ **No shopping-list generation/merge logic change**: `reorder.ts`, the reorder RPC, and
  the Store Config UI are untouched; `git status` shows only the two new `supabase/` files.

### Live Checks Run (linked project, via `supabase db query --linked`)

1. Rows + per-row assignment count → 5 rows, each `assigned_count = 1`, categories match names.
2. Aggregate counts → `rows = 5`, `assignments = 5`, `mismatched = 0`,
   `unassigned_categories_in_use = null`.
3. Latest plan's ingredient categories joined through the row config, ordered as
   `reorderGroupsByRows` would → `Dairy, Grains, Pantry, Produce, Protein`.

### Issues Found

None.

### Notes

- `git status` for this bolt: `?? supabase/migrations/20260828000000_grocery_store_config_defaults.sql`, `?? supabase/tests/database/grocery_store_config_defaults_test.sql`.
- Migration already applied to the linked project during Stage 2 (`supabase db push --linked`); it will also apply cleanly to a fresh/local database in migration order.
