---
stage: plan
bolt: 021-grocery-store-config
created: 2026-08-28T02:05:00Z
---

## Implementation Plan: grocery-store-config (bolt 021)

### Objective

Ship a known-good default grocery store layout (FR-15) so the shopping list groups in store
order with zero setup: a one-time migration that **replaces** any existing row config with 5
default rows and auto-assigns the 5 seed ingredient categories one-to-one.

### Story in Scope

- **003-default-grocery-store-rows** (FR-15, Must)

### Deliverables

1. **`supabase/migrations/20260828000000_grocery_store_config_defaults.sql`** — new, additive
   migration file (does not edit `20260827040000_grocery_store_config.sql`):
   - `delete from public.category_row_assignments;`
   - `delete from public.grocery_store_rows;`
   - `insert into public.grocery_store_rows (name, position) values` — `('Dairy',1), ('Grains',2), ('Pantry',3), ('Produce',4), ('Protein',5)`
   - `insert into public.category_row_assignments (category, row_id) select v.category, r.id from (values ('Dairy'),('Grains'),('Pantry'),('Produce'),('Protein')) as v(category) join public.grocery_store_rows r on r.name = v.category;` — matches each seed ingredient category to the row of the same name. Category strings use the seed data's exact casing (`Produce`, `Pantry`, `Protein`, `Grains`, `Dairy`).
   - Whole file wrapped so a re-run is a clean replace (the `delete` + `insert` pair already is; positions 1–5 are unique and contiguous).
2. **Apply the migration to the linked "dinner ideas" Supabase project** (same path bolt 011 used — `supabase db push`, or the Supabase MCP `apply_migration` if the CLI can't reach the project from this environment).
3. **`supabase/tests/database/grocery_store_config_defaults_test.sql`** — new pgTAP suite: exactly 5 rows at positions 1–5 with the expected names; exactly 5 `category_row_assignments`, each mapping `<name>` → the row named `<name>`.
4. **`implementation-walkthrough.md`** (Stage 2), **`test-walkthrough.md`** (Stage 3).

### Dependencies

- `grocery_store_rows`, `category_row_assignments` tables + `reorder_grocery_store_row` RPC — all live from bolt `011-grocery-store-config` (complete). `blocks: false`.
- No app/TS changes: `src/features/shopping-list/reorder.ts` already consumes whatever config exists; `src/features/store-config/*` UI already reads/writes these tables.
- No new npm packages.
- Environment note: local Supabase (Docker) is not running and direct SQL over MCP returned a permission error during Plan. Stage 2 will apply via `supabase db push` against the linked project (creds already configured, per bolt 011's log) and fall back to MCP `apply_migration` if needed. Live verification happens in Stage 3.

### Technical Approach

1. Author the migration SQL as above. Keep it a plain `delete`-then-`insert` in file order — no DO block needed; the join-on-name insert avoids hardcoding row UUIDs (which are `gen_random_uuid()`).
2. Filename timestamp `20260828000000` sorts after the existing `20260827040000_grocery_store_config.sql`.
3. Apply to the linked project; capture the applied-migration confirmation.
4. Write the pgTAP regression test mirroring the live checks (same convention as `grocery_store_config_test.sql` — `begin; select plan(N); …; select * from finish(); rollback;`).
5. Live-verify (Stage 3): query the 5 rows + 5 assignments; then sanity-check that a shopping list for an existing plan orders groups Dairy → Grains → Pantry → Produce → Protein (via `reorder.ts`'s expected input, or a direct SQL join reproducing its ordering).

### Acceptance Criteria

- [ ] `grocery_store_rows` contains exactly `Dairy`(1), `Grains`(2), `Pantry`(3), `Produce`(4), `Protein`(5) — any prior rows removed.
- [ ] `category_row_assignments` contains exactly 5 rows: `Dairy→Dairy`, `Grains→Grains`, `Pantry→Pantry`, `Produce→Produce`, `Protein→Protein`.
- [ ] Shopping list for an existing plan orders its category groups Dairy → Grains → Pantry → Produce → Protein (live-verified).
- [ ] A category with no assignment still falls back to alphabetical after configured rows (unchanged FR-12 behaviour — assert conceptually / via existing `reorder.test.ts`, no regression).
- [ ] Migration is safe to re-run (delete-then-insert).
- [ ] `grocery_store_config_defaults_test.sql` added; existing `npx vitest run` stays green (no TS change, so expected 132/132); `npx tsc -b` / `eslint` / `vite build` unaffected but re-run as a sanity gate.

### Out of Scope

- Any change to `reorder_grocery_store_row`, `reorder.ts`, or the Store Config page UI.
- Per-ingredient row overrides (still category-level only).
- Auto-creating rows for categories introduced after this seed.
