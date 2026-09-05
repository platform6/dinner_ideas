---
intent: 010-grocery-store-location-model
release: v0.10.0-0f16e95
commit: 0f16e95
units: [001-location-item-model, 002-store-config-page, 003-shopping-list-ordering]
created: '2026-09-05T11:05:00Z'
status: verified
---

# Build Record: release v0.10.0 (intent 010 — grocery store location model)

## Artifact

No container image, no registry. Same shape as v0.9.0. The release is:

- **SQL**: two committed migrations, neither yet applied to prod —
  - `supabase/migrations/20260904180000_location_item_model.sql` (520 lines) — the new
    Store → Location → Item tables, the `item_location_resolution` view, RLS, the
    ingredient→Item sync trigger, the reorder RPC.
  - `supabase/migrations/20260904190000_location_item_model_cutover.sql` (180 lines) — data
    carry-across in **one transaction**, ending in a step-5 equivalence check that raises and
    aborts if the resolved order differs from the old model.
- **Static site**: `dist/` from `pnpm run build` — Netlify builds it itself from `main`
  (`command = "pnpm run build"`, `publish = "dist"`, `NODE_VERSION = 22`).
- **No Edge Function change** (`supabase/functions/claude-proxy` untouched).
- **Not in this release**: migration B, the destructive retirement
  (`memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql`, 87 lines).
  Deliberately still outside `supabase/migrations/` per ADR-9 — see Gate below.

## Source

- Branch: `dev` @ `0f16e95`, working tree clean
- Unreleased vs `origin/main`: 11 commits (`091eed6`, `97b6645`, `7b32850`, `8a5a769`,
  `ba1cb6b`, `f40042a`, `4d8f874`, `723a0ac`, `0f16e95`, plus two v0.9.0 ops-record commits
  `5141e20`, `d4aa5ce` that are docs-only)
- Local `dev` is **8 commits ahead of `origin/dev`** — push before opening the `main` PR.

## Verification (dev / local) — 2026-09-05

| Check                  | Command                                      | Result                                      |
| ---------------------- | -------------------------------------------- | ------------------------------------------- |
| Unit + component tests | `npx vitest run`                             | ✅ 290 / 290 (32 files), 9.5s               |
| Type check             | `npx tsc -b`                                 | ✅ clean                                    |
| Lint                   | `npx eslint src`                             | ✅ clean                                    |
| Production build       | `pnpm run build` (Netlify's exact command)   | ✅ `built in 4.11s`; PWA precache 7 entries |
| pgTAP (as-is)          | `npx supabase test db`                       | ✅ 339 / 339 (19 files)                     |
| pgTAP (clean slate)    | `npx supabase db reset` + `supabase test db` | ✅ 22-migration chain applies; 339 / 339    |

- Chunk-size >500 kB warning (`index-DWt__Ki7.js`, 908 kB / 278 kB gzip) is **pre-existing**,
  present since before v0.9.0 — not a blocker.
- **pgTAP re-run today, twice.** Against the local stack as-is: 339/339. Then `supabase db
reset` — the full **22-migration chain from scratch**, including both of this release's
  migrations — followed by 339/339 again. The reset is the meaningful one: migration A cannot
  apply without its step-0 category guard and its step-5 equivalence gate both passing, so a
  clean `Applying migration 20260904190000_location_item_model_cutover.sql...` **is** those two
  gates passing. (The earlier note in this file that the project has no local Postgres/pgTAP
  stack was carried over from v0.9.0 and is out of date — a local stack has existed since
  bolt 050. Corrected.)
- What the local run still cannot prove: those gates passing against **production's** data.
  Local has only the founding household from `20260828234000`. See the deployment plan's
  pre-flight section.

## Build environment

- OS: Windows 11 (10.0.26200) · Node v22.14.0 (matches Netlify `NODE_VERSION = 22`) · pnpm 11.24.0
- Vite 5.4.21 · 2953 modules transformed

## Dependencies

**None added or changed.** `git diff origin/main..dev -- package.json pnpm-lock.yaml
netlify.toml supabase/functions` is empty.

## New / changed files in this release

30 files, +4781 / −425.

- **DB (new)**: `20260904180000_location_item_model.sql`,
  `20260904190000_location_item_model_cutover.sql`
- **pgTAP (new)**: `location_item_model_test.sql`, `location_item_model_cutover_test.sql`
- **Types**: `src/shared/lib/database.types.ts` (+311) — hand-extended with the new tables and
  the resolution view; still carries the old `grocery_store_rows` /
  `category_row_assignments` entries, which is correct while those tables still exist.
  Regen-from-prod after the migrations land.
- **002 — store-config page** (mostly new): `similarity.ts`, `location-name.ts`, and
  `components/{AddStopRow,AssignSheet,DeleteLocationConfirm,FirstRunPanel,LocationRow,LocationTypeChip,PlacementPill,UnassignedSection}.tsx`;
  rewritten `StoreConfigPage.tsx`, `api.ts`, `hooks.ts`, `types.ts`
- **003 — shopping list**: `reorder.ts`, `ShoppingListPage.tsx`; `legacy-store-rows.ts`
  created by bolt 052 and **deleted** by bolt 054
- **Removed**: `src/features/store-config/api.test.ts` (superseded by the new suites)
- Tests: `AssignSheet.test.tsx`, `UnassignedSection.test.tsx`, `similarity.test.ts`,
  `location-name.test.ts` (new) + rewrites of `StoreConfigPage.test.tsx`, `reorder.test.ts`,
  `ShoppingListPage.test.tsx`

## ADR-9 gate — migration B preconditions

| #   | Precondition                                             | State                                                                                                                                  |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Unit 002 reads the new model                             | ✅ satisfied (bolt 053)                                                                                                                |
| 2   | Unit 003 sorts by the resolution view                    | ✅ satisfied (bolt 054)                                                                                                                |
| 3   | No `src/` reference to the old tables                    | ✅ verified 2026-09-05 — only `database.types.ts` (8 hits, regenerates) and one prose comment at `src/features/store-config/api.ts:89` |
| 4   | Migration A applied to **prod**, equivalence gate passed | ❌ **open — this release is what satisfies it**                                                                                        |

Migration B does **not** ship in v0.10.0. It becomes landable only after this release's
production verification.

## Next

→ **Checkpoint 2 / 3 — deployment plan and production deploy** (user approval).
