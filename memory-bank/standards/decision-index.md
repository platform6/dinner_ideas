---
last_updated: 2026-09-04T21:05:00Z
total_decisions: 10
---

# Decision Index

This index tracks all Architecture Decision Records (ADRs) created during Construction bolts.
Use this to find relevant prior decisions when working on related features.

## How to Use

**For Agents**: Scan the "Read when" fields below to identify decisions relevant to your current task. Before implementing new features, check if existing ADRs constrain or guide your approach. Load the full ADR for matching entries.

**For Humans**: Browse decisions chronologically or search for keywords. Each entry links to the full ADR with complete context, alternatives considered, and consequences.

---

## Decisions

### ADR-1: Use Postgres Triggers + RPC Functions for Domain-Invariant Enforcement

- **Status**: accepted
- **Date**: 2026-08-26
- **Bolt**: 002-weekly-planning (weekly-planning)
- **Path**: `bolts/002-weekly-planning/adr-001-db-enforced-domain-invariants.md`
- **Summary**: This app has no backend server, so business-rule enforcement (not just access control) has nowhere to live except the database. Decided to enforce domain invariants (max-3 selections, exactly-3-to-lock, immutability after lock) via Postgres triggers, plus a single-purpose RPC function for the one action that needs atomicity (locking).
- **Read when**: Implementing any domain rule that must hold regardless of caller (state machines, cross-row counts, "exactly N" or "immutable once X" rules) in a unit backed by Supabase with no application server — check whether triggers/RPC functions are the right fit before reaching for client-side-only validation.

### ADR-2: Derived/History Writes on a State Transition Belong in a Trigger, Not the "Normal" RPC

- **Status**: accepted
- **Date**: 2026-08-27
- **Bolt**: 010-weekly-planning (weekly-planning)
- **Path**: `bolts/010-weekly-planning/adr-002-history-writes-belong-in-triggers.md`
- **Summary**: A derived write tied to a state transition (writing `meal_history` when a plan locks) was first designed inside the RPC every client call happens to use — but RLS permits other paths to cause the same transition. Decided to write it from an `AFTER UPDATE` trigger keyed on the transition itself, matching the existing exactly-3-on-lock trigger, so it fires regardless of caller.
- **Read when**: Adding any write (not just validation) that must happen whenever a row transitions between states (e.g. "record X whenever Y gets locked/approved/completed") in a Supabase-direct unit with no application server — check whether the write belongs on the transition (trigger) rather than inside whichever RPC/function is today's normal caller.

### ADR-3: One-Time Cutover of Existing Data Into a Single Founding Household

- **Status**: accepted
- **Date**: 2026-08-29
- **Bolt**: 030-household-data-model (household-data-model)
- **Path**: `bolts/030-household-data-model/adr-003-one-founding-household-model-cutover.md`
- **Summary**: Intent 004 replaced the single shared login with a three-tier `auth.users → profiles → households` model and household-scoped RLS, leaving all pre-004 data with a null `household_id`. Decided on a single forward migration that resolves the founding owner by email (`garrett.peter.conn@gmail.com`) and aborts loudly if absent, creates one founding household with a fixed UUID, stamps (not re-seeds) `household_id` onto existing rows, then sets the columns `NOT NULL` — idempotent for dev, forward-only for production.
- **Read when**: Writing a migration that folds pre-existing global/single-tenant data into a new ownership/tenancy model, backfilling a new not-null FK across live tables, or choosing how to pick an owner for legacy data — prefer an explicit lookup with a hard failure over guessing, use a fixed id for idempotency, and stamp existing rows rather than re-seeding. Also relevant when reasoning about the account model, `current_user_household_id()`, or why the `026→030` migrations must ship together.

### ADR-4: Per-Household Anthropic Key in Supabase Vault, Resolved Only by a Service-Role Function

- **Status**: accepted
- **Date**: 2026-08-31
- **Bolt**: 037-claude-proxy-service (claude-proxy-service)
- **Path**: `bolts/037-claude-proxy-service/adr-004-per-household-anthropic-key-in-vault.md`
- **Summary**: Intent 007 gives each household its own Anthropic API key (no shared key). Decided to store the key as a Supabase Vault secret named `ai_key:{household_id}`, keep only the opaque `key_secret_id` on `household_ai_config`, and mediate all access through three `security definer` functions — `set_household_ai_key` / `clear_household_ai_key` (owner-guarded, `authenticated`) and `resolve_ai_key` (`service_role` only, the single decrypt path). `key_secret_id` is column-revoked from `authenticated` so an owner cannot repoint it at another household's secret. Fallback if Vault is unusable from a definer function: a `pgsodium`-encrypted column with the same signatures.
- **Read when**: Storing any per-tenant secret / credential (API keys, tokens, webhook secrets) in a Supabase-direct app with no server; deciding between Supabase Vault and a `pgsodium` column; designing a read path that must be reachable by an Edge Function (service role) but never by a JWT client; or reasoning about `household_ai_config`, `resolve_ai_key`, or why the `claude-proxy` function holds no env key.

### ADR-5: Enforce the `claude-proxy` Daily Cap With an Atomic Counter Row, Not a Live `count(*)`

- **Status**: accepted
- **Date**: 2026-08-31
- **Bolt**: 040-claude-proxy-hardening (claude-proxy-hardening)
- **Path**: `bolts/040-claude-proxy-hardening/implementation-plan.md` (simple-construction bolt — no standalone ADR file)
- **Summary**: Intent 007 enforced the per-household daily call cap by `select count(*) from ai_usage_log where … < daily_call_limit` and inserting the usage row much later. That is not atomic under READ COMMITTED (concurrent requests all read the same count and all proceed — review finding 6), and every logged row counted, so a flood of `bad_request` rows consumed the cap (finding 5). Decided (intent 008 OQ-4) to add a dedicated `ai_call_counter (household_id, day, n)` table and a `service_role`-only `reserve_ai_call(household_id, limit)` `security definer` function that does a single `INSERT … ON CONFLICT (household_id, day) DO UPDATE SET n = n + 1 WHERE n < limit RETURNING n` — the `ON CONFLICT` row-lock serialises concurrent callers, a `NULL` return means at/over limit. The counter is bumped only immediately before a real Anthropic attempt, so `bad_request` / `no_api_key` / `rate_limited` structurally never consume it, and `ai_usage_log` stays purely an append-only audit trail (no UPDATE). Backend-side failures (the reserve, or the household/config/key lookups) fail **closed** as `upstream_error` (502) rather than proceeding as "0 used" (OQ-1: reuse the frozen `error_code` enum). Accepted cost: the counter and `ai_usage_log` row counts diverge (they measure reserved attempts vs. logged outcomes), and a function crash between reserve and call loses one slot for the day (fail-safe).
- **Read when**: Enforcing any per-tenant/per-window quota or rate limit in a Supabase-direct app with no server; deciding whether a live aggregate query is safe under concurrency (it usually isn't — reach for `INSERT … ON CONFLICT DO UPDATE … WHERE`); deciding whether to keep an audit table append-only vs. mutate it for bookkeeping; or reasoning about `ai_call_counter`, `reserve_ai_call`, why `claude-proxy` fails closed, or why an over-limit request with no key returns `no_api_key` rather than `rate_limited`.

### ADR-6: Write `household_ai_config` Through `security definer` RPCs, Not a PostgREST `.upsert()`

- **Status**: accepted
- **Date**: 2026-09-01
- **Bolt**: 042-settings-ai-remediation (settings-ai-remediation) — post-deploy fix
- **Path**: `intents/008-claude-proxy-review-remediation/deployment/deployment-plan.md` → "Post-deploy fix"; migration `supabase/migrations/20260901120000_ai_config_write_rpc.sql`
- **Summary**: `household_ai_config` is deliberately granted to `authenticated` at the **column level only** (no table-level `INSERT`/`UPDATE`) so a household owner cannot repoint `key_secret_id` at another household's Vault secret (ADR-4). Intent 008's FR-6 then revoked `UPDATE(updated_at, updated_by)` on top and had `updateAiConfig` keep a PostgREST `.upsert()` (`INSERT … ON CONFLICT DO UPDATE`). That shipped and **failed on prod with `42501 "permission denied for table household_ai_config"` even for a confirmed owner** — prod's PostgREST requires **table-level `UPDATE`** for the `ON CONFLICT DO UPDATE` form, which column grants don't provide (it passed locally — a PostgREST-version difference). The path had never been exercised end-to-end against real grants (all tests mocked `updateAiConfig` or used the key RPCs). Decided to move model/limit writes to two owner-checked `security definer` RPCs — `set_ai_model_override(text)` / `set_ai_daily_call_limit(integer)` — exactly the pattern `set_household_ai_key` / `clear_household_ai_key` already use: resolve the household server-side, check `role = 'owner'` (`42501`), validate (`22023`), `insert … on conflict do update`; the `stamp_household_ai_config_provenance` trigger still records provenance. `execute` granted to `authenticated` only. The `20260901000000` column-revoke stays as pure defense (the client no longer writes those columns directly).
- **Read when**: Writing to a table that uses **column-level grants** (a carve-out to protect a sensitive column) from a Supabase-direct client — a PostgREST `.upsert()` / `INSERT … ON CONFLICT DO UPDATE` will `42501` on it; use a `security definer` RPC instead. Also relevant when adding any owner-gated write to `household_ai_config`, or reasoning about `set_ai_model_override` / `set_ai_daily_call_limit` / why `updateAiConfig` calls `.rpc()` and takes no household id.

### ADR-7: An Items Registry Derived From Free-Text Ingredients, Deduped Exactly, Synced by Trigger

- **Status**: accepted
- **Date**: 2026-09-04
- **Bolt**: 050-location-item-model (location-item-model)
- **Path**: `bolts/050-location-item-model/adr-007-items-registry-derived-entity.md`
- **Summary**: Intent 010 lets a user place an individual ingredient on a store's walking path, which needs a stable identity for an ingredient across dinners — something `dinner_ingredients` (free text, `(dinner_id, name, quantity, unit, category)`, no dedup) has never had. Decided to add a derived, household-scoped `items` registry that this context owns and `dinner_ingredients` never knows about; dedup on a **stored generated column** `name_key = lower(btrim(name))` with `unique (household_id, name_key)` — exact, case- and whitespace-insensitive, deliberately **not** the fuzzy FR-7 similarity normalization, because a wrong suggestion costs one dismiss tap while a wrong registry merge is silent, structural, and hard to undo (and a fuzzy key can't be a unique constraint at all). Sync runs from an **`AFTER INSERT OR UPDATE OF name` trigger** on `dinner_ingredients` (`security definer`, `search_path` pinned) that resolves the household via `dinner_id → dinners.household_id` and does `insert … on conflict (household_id, name_key) do nothing` — `AFTER`, so registry sync can never block saving a dinner, and `on conflict` makes concurrent inserts of the same new name race-safe with no lock. The trigger (not app code) is the whole point: the motivating caller — a future recipe-import intent — doesn't exist yet and must need no changes here. Accepted costs: the registry only grows (renames leave the old Item, since it may still hold a user's placement), and messy import text creates an extra Item that the similarity engine fixes in one tap.
- **Read when**: Introducing a derived entity over free-text data another context owns; choosing a dedup/identity key (prefer an exact, constraint-expressible key and keep fuzzy matching as a _suggestion_ layer above it, never as the structural key); deciding between a generated column and an expression index for a dedup key; keeping derived state in sync when future writers are unknown (reach for a trigger on the write, not a call in today's save path); or reasoning about `items`, `name_key`, `fn_dinner_ingredients_sync_item`, or why recipe import will need no changes to the registry.

### ADR-8: Composite Foreign Keys as the Containment Mechanism for Scoped References

- **Status**: accepted
- **Date**: 2026-09-04
- **Bolt**: 050-location-item-model (location-item-model)
- **Path**: `bolts/050-location-item-model/adr-008-composite-fks-for-containment.md`
- **Summary**: Intent 010's placement rows reference a Household, Store, Item and Location at once, and those references must **agree** — a Location must belong to that Store, the Store and Item to that Household. Four single-column FKs each validate their own reference and say nothing about the combination, so `(store_id = A, location_id = <a location of store B>)` passes all of them; RLS stops cross-_household_ access but says nothing about cross-_store_ references inside one household, which is exactly where multi-store v2 lives. Decided to add composite unique constraints on the parents (`stores (id, household_id)`, `locations (id, store_id)`, `items (id, household_id)`) and reference them through **composite FKs that carry the scope column along** — `foreign key (location_id, store_id) references locations (id, store_id) on delete cascade`, etc. A row whose scope columns disagree with its parent's is then unwritable by anything: client, migration, or SQL editor. Two bonuses: the same constraint delivers the required cascade (so a separate `location_id → locations(id)` FK is deliberately omitted as redundant), and it makes the codebase's habit of denormalizing `household_id` onto every table **self-verifying** rather than convention-maintained. Rejected: RLS subqueries (only guard the client path), cross-table `CHECK` (unsound in Postgres), app-side validation (no server — ADR-1). Costs: three "redundant"-looking `unique (id, <scope>)` constraints, explicit composite indexes on the child side for cascades, and an invariant invisible from TypeScript (a bare `23503`).
- **Read when**: Adding any table whose row references two or more parents that must agree (tenant + sub-scope, org + workspace, store + location); deciding whether a denormalized scope column like `household_id` is safe to carry on a child table (it is, if a composite FK proves it); enforcing a "can't point outside its scope" rule with no application server; or wondering why `stores`/`locations`/`items` carry `unique (id, …)` constraints that look redundant with their primary keys, or why `item_placements` has no single-column `location_id` FK.

### ADR-9: Split a Cutover Into an Additive Migration and a Deferred Destructive One

- **Status**: accepted
- **Date**: 2026-09-04
- **Bolt**: 051-location-item-model (location-item-model)
- **Path**: `bolts/051-location-item-model/adr-009-deferred-destructive-retirement.md`
- **Summary**: Intent 010's cutover carries `grocery_store_rows` / `category_row_assignments` into the new Store/Location/Item model and then, per story 007, retires them. Dropping them in the same migration looked fine — the data is verified equivalent and a temporarily broken store-config page was explicitly acceptable during active development. It is **not** fine: `database.types.ts` is generated from the live schema and `src/features/store-config/types.ts` resolves `Database['public']['Tables']['grocery_store_rows']['Row']`, so dropping the table turns a runtime degradation into a **compile error** — `tsc -b` fails, `pnpm build` fails, and _no_ deploy can go out, including unrelated work. Decided to split: **migration A** (additive — seed stores, carry path + category placements, backfill the registry, and verify resolved-order equivalence against the still-present old model, aborting the transaction on any mismatch) ships immediately; **migration B** (the `drop table`s) is written in full now but stored at `memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql`, **deliberately outside `supabase/migrations/`** — that directory has no "pending" state, so a file placed there for later runs on the next `db reset` or deploy. Landing it is an explicit act by whoever finishes unit 002. Deferring also makes the equivalence check possible at all: dropping in the same migration would destroy the baseline in the same transaction that needs it. Accepted costs: two models coexist for a while, and story 007 completes via its "documented follow-up" clause rather than literally dropping the tables.
- **Read when**: Planning any migration that drops or renames a table, column, or function a shipped frontend still references — ask what stops **compiling**, not just what stops **working**, because generated types couple build success to the live schema. Also read when sequencing a data-layer unit that lands before the UI unit that replaces its readers; when you want to write a migration "for later" (never put it in `supabase/migrations/` — that directory is the queue, not a staging area); or when reasoning about why `grocery_store_rows` and `category_row_assignments` still exist after intent 010's cutover.

### Intent-010: Grocery Store Config Moves From Category→Row to Individual-Ingredient Placement

- **Status**: accepted
- **Date**: 2026-09-04
- **Bolt**: 050 + 051-location-item-model (location-item-model) — intent-level model change
- **Path**: `intents/010-grocery-store-location-model/requirements.md` ("Resolved Decisions"); model in `bolts/050-location-item-model/`, cutover in `bolts/051-location-item-model/`
- **Summary**: Intent `001` unit `004` let a household order its store as a list of rows and map each ingredient **category** to a row — so every Pantry item sorted together, and an individual ingredient could not be placed. Intent 010 replaces that with **Store → Location → Item**: a single ordered walking path of Locations (`section` / `aisle`, one interleaved sequence), individual-ingredient placement via `item_placements`, and `category_placements` surviving as an automatic fallback so nothing already configured stops working. Resolution is explicit → inherited → unassigned, defined once in the `item_location_resolution` view and consumed identically by the store-config page and the shopping-list sort. Five Resolved Decisions shape it: (1) the Items registry is backfilled once, then kept in sync by a **trigger** on `dinner_ingredients`, so a future recipe-import intent needs no changes (ADR-7); (2) registry dedup is **exact** — `lower(btrim(name))` — not the fuzzy similarity normalization, because a wrong suggestion costs one tap while a wrong merge is silent and structural (ADR-7); (3) deleting a Location **deletes** the placements naming it rather than nulling a column, so "no placement" is row-absence and the resolution chain is an existence check; (4) reorder reuses the existing shift-based algorithm generalized to `(store_id, position)` rather than a spaced-integer scheme — though the existing RPC's sentinel-parking proved insufficient and `locations` uses a DEFERRABLE constraint instead (bolt 050 test report); (5) the similarity suggestion (FR-7) runs **client-side in TypeScript**, matching `applyFilters`/`buildShoppingList`, with no `pg_trgm` and no Edge Function. The schema is multi-store-ready from day one (`store_id` everywhere, partial unique index on the active store) so v2 is UI-only. Cutover carried existing config across with a verified-equivalent walking order and **zero** explicit item placements — day one resolves entirely through category inheritance, exactly as the old model behaved.
- **Read when**: Working anywhere in the store-config or shopping-list-ordering domain; adding a placement-like concept (something that belongs somewhere, with a fallback); wondering why `grocery_store_rows` / `category_row_assignments` still exist (retired-in-waiting — ADR-9) or why the shopping list no longer sorts by category directly; or planning the recipe-import intent, whose ingredient writes will register Items automatically with no work in this area. See also ADR-7 (registry), ADR-8 (composite FKs), ADR-9 (deferred retirement).

### ADR-10: Open a Trigger-Owned Table With a Function, Not a Column Grant

- **Status**: accepted
- **Date**: 2026-09-05
- **Bolt**: 055-placement-review-state (placement-review-state)
- **Path**: `bolts/055-placement-review-state/adr-010-narrow-write-to-a-trigger-owned-table.md`
- **Summary**: ADR-7 made `items` trigger-owned — rows exist only as a consequence of a committed `dinner_ingredients` row, and the table carries a `SELECT` policy and nothing else, which is what guarantees one spelling rule for grocery identity (two writers could leave `"Spaghetti"` and `"spaghetti "` as separate registry entries in different aisles, and a wrong merge is silent and structural). Intent 013 needs the first legitimate application write to that table: marking an Item **reviewed**. Two shapes were available. A **column-scoped grant** (`grant update (reviewed_at)` plus a household UPDATE policy) is simpler, lets the client call `.update()`, and Postgres genuinely refuses an update touching `name` — but the invariant would then rest on a privilege being **absent**, and absences are quiet: a later `grant all on all tables in schema public`, a Supabase default-privileges change, or a routine re-grant would silently restore full write access with nothing failing, no test erroring and no advisor warning. Decided instead on a narrow `security definer` RPC `mark_item_reviewed(p_item_id uuid)` that sets `reviewed_at` and nothing else, with `items` granted **no** application write privilege at all — the protection is a thing that exists rather than a thing withheld, and deleting a function is visible in a way that forgetting to withhold a grant is not. Also matches the five narrow RPCs this schema already uses for constrained writes (`reorder_location`, the four AI-config setters). Rejected: widening the sync trigger (two responsibilities in the function ADR-7 keeps single-purpose), and a separate `item_reviews` table (a join on every read plus a second place to disagree, to avoid one nullable column). Costs: `security definer` bypasses RLS, so the household check is the function's own responsibility and must be tested rather than assumed; a cross-household or missing id affects zero rows and returns normally rather than raising, deliberately, so the caller learns nothing about other households.
- **Read when**: Adding a write to any table deliberately closed to the application — a registry, audit trail, or ledger with a single owning writer. The instinct is to grant exactly the column you need; prefer a function that names it, so the constraint exists rather than being omitted. Also read when wondering why `items` has a `SELECT` policy and no others, why marking a grocery reviewed goes through an RPC when it looks like a one-column update, or **before adding `grant all on all tables in schema public` to any migration in this project** — that line would quietly undo ADR-7 and this decision together. See also ADR-7 (the registry and its single-writer rule).
