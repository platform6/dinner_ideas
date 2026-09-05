---
intent: 010-grocery-store-location-model
release: v0.10.0-0f16e95
commit: 0f16e95
units: [001-location-item-model, 002-store-config-page, 003-shopping-list-ordering]
created: '2026-09-05T11:40:00Z'
updated: '2026-09-05T16:20:00Z'
status: production-live-checkpoint-4-open
current_checkpoint: 4
environments:
  dev:
    status: verified
    target: 'local — vitest 290/290, tsc -b, eslint, pnpm run build (Netlify cmd), pgTAP 339/339 incl. clean-slate db reset'
  staging:
    status: 'PASSED 2026-09-05 — prod-data rehearsal green. Both migrations applied clean against a restored copy of production; both gates passed on real data; both of this release''s pgTAP files ok. See "Staging result" below.'
    target: 'local supabase stack (docker supabase_db_dinner_ideas) loaded with a prod data dump'
  production:
    status: 'live 2026-09-05 — DB applied and verified; FE merged, Netlify build in progress at time of writing'
    target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main'
    db: 'APPLIED 2026-09-05 — 20260904180000 + 20260904190000 (supabase db push --linked); equivalence gate passed on production data'
    fe: 'MERGED 2026-09-05T15:58:16Z — PR #15, merge commit b50a746'
    edge_function: 'n/a — no function change'
    smoke: 'PARTIAL — S6/S7/S8 BLOCKED by the post-deploy finding below (no item is ever `unassigned`); S1-S5, S9, S10 still runnable'
    advisors: "PENDING — needs the user's own Supabase session (this session's MCP is a different account)"
open_issue: 'POST-DEPLOY FINDING 2026-09-05 — explicit item placement is unreachable in the shipped UI. Release is NOT rolled back; core ordering promise holds. Handed to Construction.'
---

# Deployment Plan: intent 010 — grocery store location model (release v0.10.0)

Current production is **v0.9.0** (`origin/main`, intents 012 + 011 + 009, live 2026-09-04).

`origin/main..dev` is 11 commits:

| Commit    | Contents                                         | Deploy surface  |
| --------- | ------------------------------------------------ | --------------- |
| `5141e20` | v0.9.0 release record                            | docs only       |
| `d4aa5ce` | v0.9.0 Checkpoint 4 close                        | docs only       |
| `97b6645` | regen `database.types.ts` from prod              | types only      |
| `091eed6` | remove intent 010 v1 (never passed Checkpoint 2) | docs only       |
| `7b32850` | intent 010 v2 inception                          | docs only       |
| `8a5a769` | **bolt 050 — Store/Location/Item data model**    | **migration A** |
| `ba1cb6b` | **bolt 051 — cutover; unit 001 complete**        | **migration B** |
| `f40042a` | intent 008 Checkpoint 4 close; storeconfig spec  | docs only       |
| `4d8f874` | **bolt 052 — walking-path page + similarity**    | FE              |
| `723a0ac` | **bolt 053 — assign flow, unassigned section**   | FE              |
| `0f16e95` | **bolt 054 — shopping list sorts by path**       | FE              |

## Scope

- **DB — two migrations, neither applied to prod.** Confirmed 2026-09-05 by
  `supabase migration list --linked`: prod's newest applied migration is `20260904020000`;
  `20260904180000` and `20260904190000` both report `remote: ""`.
  - **A · `20260904180000_location_item_model.sql`** (520 lines) — purely additive DDL:
    six new tables (`stores`, `locations`, `items`, `item_placements`,
    `category_placements`, `suggestion_dismissals`), the `item_location_resolution` view
    (`security_invoker = true`), `fn_dinner_ingredients_sync_item()` and its trigger, the
    `reorder_location(uuid, integer)` RPC, and RLS + policies on all six tables.
    **The only touch to an existing object** is the `after insert or update of name` trigger
    on `dinner_ingredients` — `security definer`, returns early on a blank name or an
    unscoped dinner, inserts `on conflict do nothing`, so it can never block a write.
  - **B · `20260904190000_location_item_model_cutover.sql`** (180 lines) — data carry-across
    in **one transaction**, every step idempotent. Step 0 guards that no
    `category_row_assignments.category` falls outside the `dinner_ingredients` CHECK set;
    steps 1–4 seed one Store per household, copy rows→locations, copy assignments→category
    placements, and backfill the Items registry; **step 5 recomputes the resolved order both
    ways and aborts the whole transaction on any difference.**
  - **Not in this release**: the destructive retirement, held at
    `memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql`,
    deliberately outside `supabase/migrations/` per ADR-9. `grocery_store_rows` and
    `category_row_assignments` survive this release intact.
- **FE** — `dev → main` merge → Netlify production build. Ships the rewritten store-config
  page (walking path, assign flow, unassigned section, first-run, desktop layout, delete
  confirm) and the shopping list's location-ordered groups.
- **Edge Function** — none (`supabase/functions/claude-proxy` untouched).
- **Dependencies** — none added; `package.json` / `pnpm-lock.yaml` / `netlify.toml` unchanged
  vs `origin/main`.

## Ordering hazard — this one is not symmetric

**Migrations before the FE (the safe direction).** Both migrations only create new objects and
new rows. The v0.9.0 FE live today reads `grocery_store_rows` and `category_row_assignments`,
which this release does not touch. The one new behaviour it would meet is the sync trigger
firing when someone saves a dinner — which writes an `items` row and returns.
**No user-visible effect.**

**FE before the migrations (the unsafe direction).**

| Surface                 | Behaviour if the new FE is live against the old schema                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/store` (store config) | **Hard breakage.** `fetchActiveStore` selects from `stores` → PostgREST 400 (relation does not exist) → the page cannot render its walking path at all.                                                                                                    |
| Shopping list           | **Degrades, does not break.** `ShoppingListPage` passes `resolved.data ?? []` into `reorderGroupsByLocation`, whose sort is stable and returns `0` for two groups both off the path — so the list still renders, in the previous alphabetical group order. |

→ **Apply both migrations first, then merge to `main`.** The ordering below does that.

There is no window in which the new FE is correct against the old schema. Because Netlify
builds on push to `main`, the DB push must complete _before_ the PR merge, not alongside it.

## Staging — required for this release (deviation from v0.8.0 / v0.9.0)

Intents 008 and 011 recorded staging as `n/a` and used the local test/build as the rehearsal.
That call was right for those releases — additive columns and frontend-only changes, where
local data is as good as any. **It does not carry over here.** Migration B is a data cutover
whose two gates (step 0's category guard, step 5's equivalence check) can only fail on data
shapes that exist in production and not locally. The local stack holds only the founding
household seeded by `20260828234000`; a green local run proves the migration is _well-formed_,
not that it will _pass on prod_.

The gates are designed to abort rather than corrupt, so the worst case on prod is a failed push
with the database unchanged — not data loss. The reason to rehearse anyway is to meet that
failure at a keyboard instead of mid-deploy, and to learn _which_ household and _which_
category is wrong before it matters.

**Rehearsal procedure.** The local stack is running; `docker exec supabase_db_dinner_ideas
psql` is the query path (there is no `psql` on PATH). `$TMP` is the session scratchpad, never
the repo.

```bash
# S0. Snapshot production data (schema comes from the migration chain, not the dump).
npx --yes supabase db dump --linked --data-only -f "$TMP/prod-data.sql"

# S1. Rebuild local at the PRE-release schema — the 20 migrations prod has today.
#     Hold this release's two migrations aside so the reset stops at 20260904020000.
mkdir -p "$TMP/held"
mv supabase/migrations/20260904180000_*.sql supabase/migrations/20260904190000_*.sql "$TMP/held/"
npx --yes supabase db reset
mv "$TMP/held/"*.sql supabase/migrations/

# S2. Load prod's data into that pre-release schema.
docker exec -i supabase_db_dinner_ideas psql -U postgres -d postgres < "$TMP/prod-data.sql"

# S3. Pre-flight both gates as pure SELECTs, BEFORE running anything that writes.
#     G1 — step 0's guard. Must return zero rows.
docker exec supabase_db_dinner_ideas psql -U postgres -d postgres -c \
  "select distinct category from public.category_row_assignments
     where category not in ('Produce','Protein','Dairy','Grains','Pantry');"
#     G2 — the shapes steps 2 and 3 assume. Both must return zero rows.
#     NB: category_row_assignments has a COMPOSITE key and no `id` column.
docker exec supabase_db_dinner_ideas psql -U postgres -d postgres -c \
  "select a.household_id, a.category, a.row_id from public.category_row_assignments a
     left join public.grocery_store_rows r on r.id = a.row_id where r.id is null;"
docker exec supabase_db_dinner_ideas psql -U postgres -d postgres -c \
  "select household_id, position, count(*) from public.grocery_store_rows
     group by 1,2 having count(*) > 1;"

# S4. Run the real thing against real data.
#     A clean apply of 20260904190000 IS both gates passing.
npx --yes supabase migration up --local

# S5. Prove the suite still agrees, against prod data.
npx --yes supabase test db     # expect 339/339
```

**Exit criterion for Checkpoint 2:** S4 applies both migrations with no `raise exception`, and
S5 shows no failure attributable to the new schema. If S3's G1 returns rows, **stop** — the
data needs cleaning (or the CHECK widening) before any prod push. That is a code/spec
decision, not a deploy decision, and it goes back to the Construction Agent.

## Staging result — executed 2026-09-05 · **PASS**

Ran S0–S5 against a `--data-only` dump of production restored onto the pre-release schema.

**Production's real shape (this is what local never had):**

|                            | Local seed       | Production                                                                             |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| households                 | 1                | 1 (`Home`)                                                                             |
| `grocery_store_rows`       | 5 (the defaults) | **8** — the 5 defaults plus `Aisle 1` (pos 4), `Bakery` (pos 5), `Garmantasdf` (pos 8) |
| `category_row_assignments` | 5                | 5                                                                                      |
| `dinner_ingredients`       | seed             | 284                                                                                    |

**S3 — gate pre-flight, all three clear:**

- **G1** (step 0's guard): zero rows. All five assignments name in-CHECK categories
  (`Dairy`, `Grains`, `Pantry`, `Produce`, `Protein`). The guard will not fire on prod.
- **G2a** (orphaned assignments): zero rows.
- **G2b** (duplicate `(household_id, position)`): zero rows.

**S4 — both migrations applied with no abort.** A clean apply of `20260904190000` _is_ step 0
and step 5 passing against production data. Result:

```
 store    | position | name        | type    | category
 My Store |        1 | Dairy       | section | Dairy
 My Store |        2 | Produce     | section | Produce
 My Store |        3 | Pantry      | section | Pantry
 My Store |        4 | Aisle 1     | aisle   |
 My Store |        5 | Bakery      | section |
 My Store |        6 | Grains      | section | Grains
 My Store |        7 | Protein     | section | Protein
 My Store |        8 | Garmantasdf | section |
```

1 store · 8 locations · 121 items · 5 category_placements · **0 item_placements** (by design).

Two things this bought that the local run could not:

1. **The `aisle` branch of the type heuristic actually fires on prod.** `Aisle 1` correctly
   infers as `aisle`. Migration A's comment claims it was "verified against live data: all
   five seeded default rows … correctly infer as `section`" — that was written against the
   _local_ five, not prod's eight. The claim is not wrong, but it is narrower than it reads.
   The untested branch is now tested, and it is right.
2. **Positions are 1..8 contiguous with no gaps**, so step 2's reliance on the old table's
   `unique (household_id, position)` holds on real data.

**S5 — pgTAP 330/339, and every one of the 9 failures is a seed-fixture assertion, none
related to this release.**

- **Both of this release's files pass**: `location_item_model_test.sql` **ok**,
  `location_item_model_cutover_test.sql` **ok**.
- The 9 failures break down as: 8 caused by production data differing from the seed fixture
  the suite asserts against — `grocery_store_rows has exactly 5 rows` (prod has 8),
  `default rows are … at positions 1..5` (prod's order differs), `dinner_tags is empty`
  (prod has 5), and three `idx_weekly_plans_one_unlocked` collisions because prod already
  holds an unlocked weekly plan — plus 1 self-inflicted (`the founding household has exactly
one member`, because the rehearsal added a second).
- Root cause of the initial, larger failure count (19): the suite hardcodes
  `request.jwt.claims.sub = '…0000f0'`, the founding-household owner from migration
  `20260828234000`. Production's owner is a different profile, so `current_user_household_id()`
  returned NULL and `weekly_plans.household_id` NOT NULL fired. Granting that fixture identity
  membership in the restored household resolved 10 of the 19.
- **This is a property of the test suite, not of the release.** The suite is written against
  the seed fixture and is not portable to arbitrary data. Worth knowing, but not a blocker,
  and not something to "fix" for this deploy.

**Cleanup performed:** the production dump was deleted from the scratchpad, and the local
stack was `db reset` back to its normal seeded state (5 rows / 5 locations, all 22 migrations).
Working tree unchanged.

**Incidental correction:** an early check in this session concluded there were no foreign keys
from `public` into `auth`. That was wrong — `profiles.id` references `auth.users(id)`; the
`information_schema` query used did not surface it. It changed nothing about the outcome (the
dump carries the `auth` schema anyway), but the plan should not be read as saying `public` is
auth-independent.

## Progression

```text
[x] Dev  — verified 2026-09-05 (see deployment/build.md)
    [x] vitest              290/290 (32 files)
    [x] tsc -b              clean
    [x] eslint              clean
    [x] pnpm run build      clean (Netlify's exact command)
    [x] pgTAP               339/339, and again after a clean-slate `db reset`
[x] Staging — Checkpoint 2  PASSED 2026-09-05 (see "Staging result")
    [x] S0  dump prod data to the scratchpad
    [x] S1  local reset to the pre-release 20-migration schema
    [x] S2  load prod data (1 household, 8 store rows, 284 ingredients)
    [x] S3  gate pre-flight G1 + G2a + G2b — all zero rows
    [x] S4  `migration up` applied A and B with no abort; `Aisle 1` inferred as `aisle`
    [x] S5  pgTAP — both location/item files ok; 9 seed-fixture failures, none release-related
    [x] cleanup — prod dump deleted, local stack reset to seeded state
[x] Production — Checkpoint 3  DEPLOYED 2026-09-05
    [x] 0.  git push origin dev                          (97b6645..b6065a1)
    [x] 1.  migration list --linked                      — both confirmed remote:"" immediately prior
    [x] 2.  DB:  supabase db push --linked               — both applied; equivalence gate passed on prod data
    [x] 3.  post-push read: prod matches the rehearsal exactly — 1 store, 8 locations,
            121 items, 5 category_placements, 0 item_placements, 0 suggestion_dismissals;
            `Aisle 1` -> type `aisle`; positions 1..8 verbatim. grocery_store_rows and
            category_row_assignments both still present (rollback path intact).
    [x] 4.  FE:  PR #15 merged 2026-09-05T15:58:16Z -> main b50a746; Netlify main build triggered
    [x] 5.  regen types from prod — **no-op**. The plan predicted "expect a real diff this
            time"; that was wrong. The generator's raw output differs from the committed file
            only in ordering and formatting, and prettier normalises it back to byte-identical
            (the commit was rejected as empty). Table/function set is 37 before and 37 after,
            none added, none removed — the hand-written definitions from bolts 050/051 were
            already exactly right. Nothing to commit. tsc -b clean, vitest 290/290.
[~] Verify production — Checkpoint 4  OPEN (blocked, see finding below)
    [x] db push output confirms both migrations applied
    [x] Netlify main build triggered by the b50a746 merge (user-confirmed building)
    [~] Smoke S1–S10 — S6/S7/S8 BLOCKED (no item is ever `unassigned`);
        S1–S5, S9, S10 still runnable and not yet run
    [ ] get_advisors (security + performance) — six new RLS'd tables and a security_invoker
        view; expect no critical issues, but this is the first release to add policies since
        20260828230000, so read it rather than assume it.
        Needs the user's own Supabase session.
```

## POST-DEPLOY FINDING — explicit item placement is unreachable (2026-09-05)

Found by the product owner within minutes of the deploy, looking at prod: searching
"Not on the path yet" for `spaghetti` returns nothing. Their first reading was that no recipes
were selected. That is not the cause — `inRecipeNameKeys` derives from **active dinners**, not
weekly picks. The real cause is structural.

**Every item resolves as `inherited`. Nothing is ever `unassigned`.**

```
 state     | count
 inherited |   121
```

Why it cannot be otherwise, for a healthy household:

1. `dinner_ingredients.category` is **NOT NULL** and CHECK-constrained to the five values.
2. An Item's category is the modal category of its ingredient rows, so it is always one of
   those five.
3. The cutover placed all five categories (it had five assignments to carry).
4. `item_location_resolution.state` is `unassigned` only when `item_category` is NULL — which
   requires an Item with **no matching `dinner_ingredients` rows at all**, i.e. an orphan left
   by a deleted dinner.

Second-order: `UnassignedSection`'s default list is `unassigned ∩ used-in-an-active-recipe`.
Those two predicates are contradictory, so that list is **empty by construction**, not merely
empty today. The search widens past the in-recipe narrowing but stays inside `unassigned`, so
it cannot reach an in-recipe item either.

**The second entry point does not rescue it.** `LocationRow` exposes a `PlacementPill` per
item, but `EXPANDED_ITEM_CAP = 4` — only the first four items per location, alphabetically.
Grains holds 20 items and starts `basmati rice, breadcrumbs, brown rice, burger buns`; both
spaghetti items sort far below. Across the store roughly **20 of 121 items are reachable**.

**Consequence**: `Bakery`, `Aisle 1` and `Garmantasdf` — the three locations the cutover
carried across with no category — cannot receive any item through the shipped UI. FR-4, FR-12
and FR-13 are effectively unreachable in production.

**Why the test suites did not catch it**: the component tests construct `unassigned` items
directly as fixtures, so they exercise a state the real data never produces. The pre-deploy
rehearsal verified the migration against production _data_; it did not drive the UI, so it was
never going to catch this class of defect. Worth remembering for the next data-shaped release —
a green cutover says nothing about whether the feature built on top of it is reachable.

**Disposition — NOT rolled back.** Deliberate:

- The release's core promise holds. The shopping list sorts by walking path and produces the
  same order as before the cutover; the equivalence gate proved it and the S10 smoke can still
  confirm it.
- Nothing regressed. Per-item placement did not exist before this release, so no capability was
  lost — a new one is unreachable.
- Rolling back would surrender the ordering improvement to fix a feature nobody can currently
  reach. Roll forward.

**Resolution: intent `013-placement-edit-control`** (created 2026-09-05). It covers item and
category moves, an all-groceries search, and a review state that gives the section a real
population. Bolt 055 landed the data layer and corrected FR-6 and FR-13 in this intent's
requirements. Checkpoint 4 here stays open until that intent's UI work ships and S6-S8 can run.

**Originally handed to the Construction Agent.** This is a design gap in the resolution states and the
assign entry points, not a deployment problem. Two candidate directions, for Construction and
the product owner to choose between — Operations is not the right place to pick:

1. Let the unassigned section reach `inherited` items too (i.e. rethink what the section is
   for — "everything you have not explicitly placed" rather than "everything with no
   location"), or
2. Remove or raise `EXPANDED_ITEM_CAP` so every item under a location is tappable.

Checkpoint 4 stays **open** until this is resolved and the blocked smoke tests can run.

## Smoke (Checkpoint 4) — run on prod as a household owner

| #   | FR    | Check                                                          | Pass                                                                                                            |
| --- | ----- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| S1  | 10    | `/store` right after the deploy                                | the walking path shows the same rows, in the same order, as the old page did before the release                 |
| S2  | 1     | `select count(*) from stores where is_active`                  | exactly one per household — including any household that had no rows at all                                     |
| S3  | 11    | Add a location, rename it, drag it up one, remove it           | each persists across a reload; positions stay contiguous                                                        |
| S4  | 9     | Reorder via drag                                               | `reorder_location` returns 200; no gap and no duplicate position                                                |
| S5  | 3     | Save a dinner with a brand-new ingredient name                 | an `items` row appears for it (the trigger), in the same household                                              |
| S6  | 12/7  | Open the assign flow on an unassigned item                     | suggestions ranked by similarity; assigning writes an `item_placements` row                                     |
| S7  | 8     | Dismiss a suggestion, reopen the sheet                         | it does not come back                                                                                           |
| S8  | 13/14 | "Not on the path yet" section; a household with an empty store | unassigned items listed; an empty store shows the first-run panel                                               |
| S9  | 16    | Delete a location that still has items                         | the confirm names the count; after deleting, those items fall back to unassigned                                |
| S10 | 17    | Shopping list for a 3-pick week                                | groups ordered by walking path, matching `/store` — **and matching the order the list had before this release** |

S10 matters most: it is the user-visible restatement of migration B's step-5 equivalence check.

## Rollback

The release is two independent halves; roll back the half that is wrong.

- **FE only (most likely case — a UI defect):** redeploy the previous Netlify production
  deploy. Instant. The v0.9.0 FE reads `grocery_store_rows` / `category_row_assignments`,
  which this release leaves fully intact, so it works immediately with the new schema in
  place. **This is the real rollback story, and it is cheap precisely because retirement was
  deferred.**
- **DB, migration B (data):** the migration documents its own undo —
  `delete from public.category_placements; delete from public.locations;
delete from public.items; delete from public.stores;` — safe because B creates rows and
  updates or deletes nothing pre-existing. Note it also discards any _new_ user edits made
  through the new store-config page since the deploy, so pair it with the FE rollback.
- **DB, migration A (schema):** dropping six tables, a view, an RPC and a trigger is a larger
  action than any defect this release can plausibly produce; prefer roll-forward. If ever
  needed, drop the trigger first (`drop trigger trg_dinner_ingredients_sync_item on
public.dinner_ingredients`), then the view, then the tables in FK order.
- **A failed push needs no rollback at all.** Migration B is one transaction ending in the
  equivalence gate: if the gate raises, steps 1–4 roll back and prod is exactly as it was.
- No down-migrations are committed; prefer roll-forward in every case except a genuine data
  problem.

## ADR-9 gate — what this release unlocks

| #   | Precondition                                         | State after this release                                          |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Unit 002 reads the new model                         | ✅ (bolt 053)                                                     |
| 2   | Unit 003 sorts by the resolution view                | ✅ (bolt 054)                                                     |
| 3   | No `src/` reference to the old tables                | ✅ except `database.types.ts` (regenerates) and one prose comment |
| 4   | Migration A applied to prod, equivalence gate passed | ⏳ **satisfied by Checkpoint 4 of this plan**                     |

The destructive retirement becomes landable only after Checkpoint 4 closes green — and should
be a release of its own, not a rider.

## Notes / deviations

- No container/registry artifact. The DB artifact is the committed SQL; Netlify builds the FE
  itself on the push to `main`; no Edge Function.
- **Correction to `deployment/build.md`:** it describes the chain as "24 migrations". There
  are **22** files in `supabase/migrations/` (20 applied on prod + this release's 2). The
  verification it records is unaffected — only the count was wrong.
- Staging here is a local rehearsal against a production _data_ dump, not a separate hosted
  environment. This project has never had one; standing one up is out of scope for this
  release, and the rehearsal buys the specific assurance this release needs.
- The prod data dump is transient — it lives in the scratchpad, never the repo, and is deleted
  after Checkpoint 2. It contains real household data.
- The Supabase MCP connection available in this session is authenticated to a **different**
  account (it lists `ffwwdbgvnftlbhrwaryf` and `zoqiieysgywfqbybjeac`, not
  `gpkqsedtlzxczmarxjia`), so `get_advisors` and `execute_sql` are not reachable that way.
  Every prod interaction in this plan goes through the linked `supabase` CLI instead;
  Checkpoint 4's advisor review will need the user's own Supabase session.
