---
version: v0.4.0-f819f32
commit: f819f32
branch: dev
built: '2026-08-29T20:31:00Z'
status: success
intent: 004-account-model
units:
  - 001-household-data-model
  - 002-account-model-ui
---

# Build: v0.4.0-f819f32

First deployable release of intent `004-account-model` (the three-tier account model:
`households` / `profiles` / `household_members`, `household_id` on every domain table, a
full household-scoped RLS rewrite, `seed_default_household_catalog()`, `handle_new_user()`
provisioning, and the one-time founding-household cutover).

## Artifacts

This project has **two** deployable surfaces, neither of which is a container/registry
artifact:

| Surface      | Artifact                                                                                                                        | Produced by                               | Registry                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Frontend SPA | `dist/` static bundle (953 KB; `assets/index-CW4uuAXI.js` 838 KB / 256 KB gzip, `sw.js` + Workbox precache 7 entries / 825 KiB) | `pnpm run build` (`tsc -b && vite build`) | Netlify build — runs on push, not uploaded manually                            |
| Database     | 5 forward migrations `supabase/migrations/20260828230000..20260828234000`                                                       | committed in `f819f32`                    | Supabase linked project `gpkqsedtlzxczmarxjia` via `supabase db push --linked` |

### Migration set in this build

| File                                                    | Story / Bolt          | Risk                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260828230000_account_model_identity_household.sql`   | 001,002 / 026         | low — new tables + helper, additive                                                                                                                                                                                                                                                                                                   |
| `20260828231000_account_model_household_id_columns.sql` | 003 / 027             | low-med — adds `household_id` (nullable), reworks uniques to composite `(household_id, ...)`                                                                                                                                                                                                                                          |
| `20260828232000_account_model_household_scoped_rls.sql` | 004 / 028             | med — rewrites all 35 RLS policies to household-scoped                                                                                                                                                                                                                                                                                |
| `20260828233000_account_model_provisioning.sql`         | 005,006,007,009 / 029 | med — `seed_default_household_catalog()` (1401 lines, mechanically generated), `handle_new_user()` on `auth.users`, `household_invites`, scoped meal-history trigger / reorder RPC / last-chosen view                                                                                                                                 |
| `20260828234000_account_model_founding_household.sql`   | 008 / 030             | **HIGH — runs against real production data.** Folds every existing row into one founding household owned by `garrett.peter.conn@gmail.com`, then `SET NOT NULL` on 6 `household_id` columns + promotes `category_row_assignments` to composite PK. One-shot forward migration; idempotent guard on the fixed founding-household UUID. |

## Version calculation

No semver in `package.json` (`0.0.0`) and no git tags in this repo — releases are
PR merges `dev` -> `main`. Synthetic tag for this deployment record:
`v0.4.0` (intent 004, first ship) + `-f819f32` (HEAD short SHA).

## Build environment

- OS: Windows 11 (win32 10.0.26200)
- Node: v22.14.0
- pnpm: 11.24.0 (Netlify pins `PNPM_VERSION = 11.1.3`, `NODE_VERSION = 22` in `netlify.toml`)
- Vite PWA: v1.3.0 (`generateSW`)
- Supabase CLI: local stack via Docker (`supabase_*_dinner_ideas` containers)

## Verification (against committed HEAD f819f32)

| Check                                     | Result                                         | When              |
| ----------------------------------------- | ---------------------------------------------- | ----------------- |
| `npx tsc -b`                              | ✅ exit 0                                      | 2026-08-29T20:29Z |
| `npx vite build`                          | ✅ built in 5.05s, `dist/` + `sw.js` generated | 2026-08-29T20:29Z |
| `npx supabase db test` (pgTAP, Docker DB) | ✅ 12 files / **165 tests** pass               | 2026-08-29T20:30Z |
| `npx vitest run`                          | ✅ 22 files / **148 tests** pass               | 2026-08-29T20:30Z |

`database.types.ts` in this build was regenerated from the **local** Supabase schema.
Per the unit-002 construction log it must be regenerated once more with
`supabase gen types typescript --linked` after the migrations reach prod, then `tsc -b`
re-run (expected identical).

## Prod migration gap (linked project `gpkqsedtlzxczmarxjia`)

`supabase migration list --linked` — remote is current through `20260828000000`.
**5 pending**: `20260828230000`, `231000`, `232000`, `233000`, `234000`.

## Post-build fix (2026-08-31) — supersedes `f819f32`'s migration 5

The Checkpoint 2a prod-data rehearsal (local Docker scratch DB from
`supabase db dump --linked`) caught two defects in
`20260828234000_account_model_founding_household.sql`, each of which would have failed
`supabase db push --linked` against production after committing migrations 1–4:

1. **Founding owner** — migration resolved `garrett.peter.conn@gmail.com`; prod
   `auth.users` holds only `platform.six@gmail.com`, so the "never guess an owner"
   `RAISE` aborted. Retargeted to `platform.six@gmail.com` (+ founding-household pgTAP
   test); founding household name `'Conn household'` → `'Home'`.
2. **Locked-plan backfill** — the `household_id` backfill `UPDATE` on `weekly_plans`
   hit the pre-existing `trg_weekly_plans_block_edit_after_lock` trigger (prod has 2
   locked plans). Backfill now `disable trigger … enable trigger` around the 6 updates.

Re-verified after the fix (local, `dev`):

| Check                                               | Result                                                                                                  | When              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------- |
| prod-data rehearsal (5 migrations on prod snapshot) | ✅ all apply; row counts preserved; every row on founding household `…0001`; real resolve-by-email path | 2026-08-31T14:00Z |
| `npx supabase db reset` (bootstrap path)            | ✅ clean                                                                                                | 2026-08-31T13:56Z |
| `npx supabase test db` (pgTAP)                      | ✅ 12 files / **165 tests** pass                                                                        | 2026-08-31T13:56Z |
| `npx vitest run`                                    | ✅ 22 files / **148 tests** pass                                                                        | 2026-08-31T13:57Z |
| `npx tsc -b`                                        | ✅ exit 0                                                                                               | 2026-08-31T13:58Z |
| `npx vite build`                                    | ✅ built in 4.88s, `sw.js` generated                                                                    | 2026-08-31T13:58Z |

Deployment record: see `deployment-plan.md` → Checkpoint 2a. New synthetic version once
the fix commits: `v0.4.1-<sha>`.
