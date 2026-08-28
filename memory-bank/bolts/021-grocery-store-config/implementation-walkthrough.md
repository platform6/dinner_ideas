---
stage: implement
bolt: 021-grocery-store-config
created: 2026-08-28T02:30:00Z
---

## Implementation Walkthrough: grocery-store-config (bolt 021)

### Summary

Added a one-time seed migration that replaces any existing grocery-store-row configuration
with 5 default rows (Dairy, Grains, Pantry, Produce, Protein) and assigns each of the 5 seed
ingredient categories to the row of the same name. Applied to the linked "dinner ideas"
Supabase project and live-verified. No application code changed.

### Structure Overview

Pure data migration against tables that already exist (`grocery_store_rows`,
`category_row_assignments` from bolt 011). The migration runs in a single transaction:
clear both tables, insert the 5 rows with fixed positions 1–5, then insert the 5 category
assignments by joining the category name to the row of the same name (so it never hardcodes
the `gen_random_uuid()` row ids). The shopping list's group ordering already flows through
`src/features/shopping-list/reorder.ts`, which reads whatever config exists — so the new
defaults take effect with no code change.

### Completed Work

- [x] `supabase/migrations/20260828000000_grocery_store_config_defaults.sql` — clears existing store-row config and seeds the 5 default rows + 5 name-matched category assignments; wrapped in `begin/commit`; safe to re-run (delete-then-insert, name-join not id-join).
- [x] `supabase/tests/database/grocery_store_config_defaults_test.sql` — new pgTAP suite (5 assertions): exactly 5 rows in the expected name/position order, exactly 5 assignments, each assignment points at the same-named row.
- [x] Migration applied to the linked project via `npx supabase db push --linked --include-all` (`Finished supabase db push.`, migration `20260828000000` listed as applied).

### Key Decisions

- **Join on row name, not row id**: row ids are `gen_random_uuid()`, so the assignment insert selects `r.id` by matching `r.name` to the category literal — keeps the migration free of generated ids (per the migration-authoring rule) and re-runnable.
- **`delete` then `insert` rather than `truncate`/`upsert`**: matches "Replace with defaults" exactly and is the simplest idempotent form; the FK cascade would also clear assignments on row delete, but clearing them first states the intent.
- **Simple bolt, no ADR**: no schema/RPC/entity change — the DDD flow bolt 011 used doesn't apply here.

### Deviations from Plan

None. (Live verification, planned for Stage 3, was run opportunistically right after the push — results recorded in the test report.)

### Dependencies Added

None. No npm packages; no new tables or functions.

### Developer Notes

- Live checks against the linked project immediately after push: `grocery_store_rows` = 5 (Dairy/Grains/Pantry/Produce/Protein at 1–5), `category_row_assignments` = 5, 0 mismatched, and **no** ingredient category currently in use is left unassigned.
- Sanity gate re-run (no TS change expected to matter): `npx tsc -b` ✅, `npx eslint .` ✅, `npx vitest run` ✅ 132/132, `npx vite build` ✅.
- The pgTAP file needs `supabase test db` (Docker) to run; Docker is not available in this environment, so it stands as a durable regression suite mirroring the live checks — same situation noted for `grocery_store_config_test.sql` in bolt 011.
