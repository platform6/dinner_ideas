---
unit: 001-location-item-model
bolt: 050-location-item-model
stage: test
status: complete
updated: '2026-09-04T17:51:59Z'
---

# Test Report - Location/Item Model

## Summary

| Suite                               | Result             | Notes                                                  |
| ----------------------------------- | ------------------ | ------------------------------------------------------ |
| **pgTAP — this bolt**               | **53/53 passed**   | `supabase/tests/database/location_item_model_test.sql` |
| **pgTAP — pre-existing (17 files)** | **256/256 passed** | No regression from the new tables or the trigger       |
| **pgTAP — total**                   | **309/309 passed** | `Files=18, Tests=309 … Result: PASS`                   |
| **Frontend (Vitest)**               | **222/222 passed** | 29 files; unaffected, as expected                      |
| **`tsc -b`**                        | Clean              | Regenerated `database.types.ts` typechecks             |
| **ESLint**                          | Clean              | —                                                      |
| **Migration apply**                 | Clean from scratch | `supabase db reset` — full chain of 21 migrations      |

Command: `npx supabase test db`

### On coverage

Line-coverage tooling doesn't apply to a bolt whose deliverable is one SQL migration. The
meaningful measure is **acceptance-criteria coverage**, reported below: **24 of 24** criteria
across the 6 stories are exercised by an assertion, plus 5 assertions covering security
properties that no story states explicitly but that the design depends on.

---

## Acceptance Criteria Validation

### Story 001 — `stores` + `locations` schema

- ✅ `stores` exists with the partial `unique (household_id) where is_active` — a second
  **active** store raises `23505`; a second **inactive** store is accepted (v2-ready)
- ✅ `locations` exists with `type in ('section','aisle')` — `'department'` raises `23514`
- ✅ `unique (store_id, position)` and `unique (id, store_id)` both asserted present
- ✅ RLS mirrors `20260828232000` — verified by cross-household isolation, not just by shape
- ✅ A location name with no parseable number is valid — every fixture name (`Produce`,
  `Deli`, `Bakery`) is unnumbered and sorts purely by `position`

### Story 002 — Items registry + sync trigger

- ✅ `items` with generated `name_key` and `unique (household_id, name_key)`
- ✅ The trigger fires on `dinner_ingredients` insert, resolving the household via
  `dinner_id → dinners.household_id` — 4 ingredient rows produce 3 Items
- ✅ `"Black Beans"` and `"  black beans  "` collapse to exactly one Item, stored trimmed as
  first written
- ✅ `update of name` registers the new Item and leaves the old one in place (ADR-7's
  deliberate no-pruning)
- ✅ Re-inserting an existing normalized name is a silent no-op — no duplicate, no error
- ✅ Source-agnostic sync: verified through the **provisioning path** — `seed_default_household_catalog()`
  turned 284 seeded ingredient rows into **121 Items with zero changes to that function**.
  This is ADR-7's central claim demonstrated: a caller that knows nothing about the registry
  populates it correctly.
- ✅ RLS applied to `items`

### Story 003 — Item and category placements

- ✅ `item_placements` with `unique (item_id, store_id)` and the composite FK
- ✅ `category_placements` with `unique (store_id, category)` and the same shape
- ✅ Deleting a Location **deletes** the dependent placements (not nulls them); both
  `location_id` columns asserted `NOT NULL`
- ✅ **A placement naming another store's Location raises `23503`** — asserted for both
  placement tables. This is the bug class ADR-8 exists to make impossible.
- ✅ RLS applied to both tables

### Story 004 — Location resolution

- ✅ Order is exactly explicit → inherited → unassigned. Tested with an item that has **both**
  an explicit placement _and_ a matching category placement — it resolves `placed` at the
  explicit location, proving precedence rather than merely filling a gap.
- ✅ One shape for both consumers: `state`, `via_category`, `location_id`, `location_position`
- ✅ Inheritance reads the item's own `dinner_ingredients.category` and reports it in
  `via_category` (so the UI can say "via Produce")
- ✅ No placement at either level → `unassigned` with a null `location_id`; never an error
- ✅ **Totality**: row count from the view equals the household's Item count exactly — no Item
  dropped, none duplicated by the joins

### Story 005 — Suggestion dismissals

- ✅ Table exists with `unique (store_id, item_id, suggested_item_id)`
- ✅ RLS applied
- ✅ A repeat dismissal is a no-op via `on conflict do nothing`, leaving exactly one row
- ✅ An Item cannot be its own suggestion (`23514`)

### Story 006 — Reorder RPC

- ✅ Shift-and-renumber scoped to the target's `store_id`, verified in **both** directions
  across 2+ positions
- ✅ `(store_id, position)` stays unique through every reorder
- ✅ Sections and aisles move within one interleaved sequence — the fixture path mixes both
  types and no per-type sub-ordering appears
- ✅ An out-of-range position raises
- ✅ Another store's positions are provably untouched by a reorder

### Security properties (no story states these; the design depends on them)

- ✅ `item_location_resolution` is `security_invoker = true` — and the **behavioural** check:
  an authenticated member of household B reads **0** rows belonging to household A through
  the view
- ✅ `fn_dinner_ingredients_sync_item` is `security definer` with `search_path` pinned to `''`
- ✅ The trigger is attached to `dinner_ingredients`
- ✅ `items` has **0** client INSERT/UPDATE/DELETE policies
- ✅ A client insert into `items` raises `42501` — the registry is trigger-written only

---

## Issues Found

### 1. 🔴 Pre-existing production bug in `reorder_grocery_store_row` (NOT introduced here)

Stage 2 instructed Stage 4 to mirror the existing RPC's shift technique rather than invent a
second convention. Mirroring it faithfully reproduced a latent bug, which then failed
immediately in testing. Verified against the **shipped** function:

```text
select * from reorder_grocery_store_row(<Protein, position 5>, 1);
ERROR:  duplicate key value violates unique constraint
        "grocery_store_rows_household_id_position_key"
```

**Cause**: sentinel parking (`set position = -1`) rescues only the mover's own slot. The range
shift itself still collides row-to-row, because Postgres checks a non-deferrable unique
constraint **per row**: shifting up, the row at N moves to N+1 while N+1 still holds its old
value.

**Why it has survived in production**: v1's UI reorders with one-step arrows, and a
single-step upward move is the one case parking does cover (the only shifted row moves into
the slot the parked mover just vacated). Any move of 2+ positions upward fails.

**Resolution in this bolt**: `locations`' `unique (store_id, position)` is
`DEFERRABLE INITIALLY DEFERRED` and `reorder_location` does **no** parking. Uniqueness is
proven at commit, so the shift is correct at any distance in either direction — asserted by
two tests that would fail under the mirrored technique.

**Left open deliberately**: `reorder_grocery_store_row` itself is not fixed. It is outside
this bolt's scope, and bolt 051 retires `grocery_store_rows` entirely. Flagged for the user;
it is a live bug today but unreachable through the current one-step arrow UI.

### 2. Two deviations from story text, both accepted at the Stage 4 checkpoint

| Deviation                                                                        | Story text                                           | Why                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items` gets a **SELECT-only** policy plus `revoke insert, update, delete`       | 002: "mirrors `20260828232000`'s shape" (4 policies) | Makes ADR-7's claim structurally true. The trigger and bolt 051's backfill run as table owner, so neither is affected. Precedent: `ai_call_counter`.                                                |
| `category_placements.category` carries `dinner_ingredients.category`'s **CHECK** | 003: "the same free-text set … no new enum"          | The live column is `NOT NULL` with a 5-value CHECK, not free text. Inheritance is exact string equality, so an unconstrained value (`'produce'`) would create a placement row that can never match. |

### 3. Two defects in the first draft of the test file (fixed)

- Plan count declared 38 while 53 assertions ran.
- One assertion expected an item to inherit `via_category = 'Pantry'` when its actual category
  was `Produce` — a wrong expectation in the test, not a defect in the view. The fixture now
  places both categories, which also strengthened the precedence test.

### 4. Behaviour change worth noting for Operations

New household provisioning now writes ~121 additional `items` rows per signup (a side effect
of the trigger firing during catalog seeding). Desirable — new households get a populated
registry for free — but it is a change to the signup path's write volume.

---

## Recommendations

1 - **Bolt 051 must backfill the founding household.** Existing `dinner_ingredients` rows
predate the trigger, so the founding household currently has **284 ingredient rows and 0
Items**. Verified directly. This is exactly story 007's scope and is not a defect here — but
until 051 runs, the resolution view returns no rows for the existing household.

2 - **Decide on `reorder_grocery_store_row`.** Either accept it as retiring-with-051, or fix
it in its own bolt. It should not be fixed inside 050.

3 - **Re-run `get_advisors` after deployment.** All FK columns are indexed and both functions
are `search_path`-pinned, so nothing is expected — but the advisor check belongs to
Operations, against the real project.

4 - **Concurrency is argued, not load-tested.** The registry's `on conflict do nothing` and
the reorder's `FOR UPDATE` are both single-statement/lock-based and match patterns already
proven in this codebase. No performance or stress tests were written: the data is
household-scale (dozens of rows per table) and the bolt type's performance-test activity has
no meaningful target here.

5 - **Unit 002 owns the similarity engine's use of `suggestion_dismissals`.** This bolt
verified the table's shape makes the exclusion a simple anti-join; the anti-join itself is
FR-7's, not tested here.
