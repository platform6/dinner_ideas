---
version: v0.8.0-1e20c9f
commit: 1e20c9f
branch: dev (merged -> main 2026-09-01)
built: '2026-09-01T02:30:00Z'
status: success
intent: 008-claude-proxy-review-remediation
units:
  - 001-claude-proxy-hardening
  - 002-settings-ai-remediation
---

# Build: v0.8.0-1e20c9f

Intent `008-claude-proxy-review-remediation` — all 10 findings from the code review of intent
`007`: fail-closed daily cap + atomic `ai_call_counter` (FR-1/FR-2), surfaced resolver errors
(FR-3), reachable SDK `timeout` + metering isolation (FR-4), settings-UI stale-field / hung
`callClaude` / dead `useEffect` (FR-5), server-stamped config provenance (FR-6). Frozen
`claude-proxy` request/response contract unchanged; 200 happy-path body unchanged.

## Artifacts

Two deployable surfaces, neither a container/registry artifact (same as intent 004):

| Surface       | Artifact                                                                                             | Produced by                               | Registry / mechanism                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Database      | 2 forward migrations `20260831213000_ai_call_counter.sql`, `20260901000000_ai_config_provenance.sql` | committed in `1e20c9f`                    | Supabase linked project `gpkqsedtlzxczmarxjia` via `supabase db push --linked` |
| Edge Function | `supabase/functions/claude-proxy/` (Deno bundle, script size ~1.6 MB)                                | `supabase functions deploy claude-proxy`  | Supabase Edge runtime, project `gpkqsedtlzxczmarxjia`                          |
| Frontend SPA  | `dist/` static bundle (`vite build` + Workbox `sw.js`)                                               | `pnpm run build` (`tsc -b && vite build`) | Netlify — builds on push to `main`, not uploaded manually                      |

### Migration set in this build

| File                                      | Unit / Bolt | Risk                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260831213000_ai_call_counter.sql`      | 001 / 040   | **low** — additive: new `ai_call_counter` table (household-scoped RLS, member-read, no client write), `reserve_ai_call(uuid,integer)` `security definer` fn (`service_role` execute only). No change to existing tables.                                                                                                                                                                                                         |
| `20260901000000_ai_config_provenance.sql` | 002 / 042   | **low-med** — additive trigger `stamp_household_ai_config_provenance` + `trg_household_ai_config_provenance` on `household_ai_config`; **revokes `insert/update (updated_at, updated_by)` from `authenticated`**. The revoke breaks the OLD frontend's `updateAiConfig` (which still sends `updated_at`) until the new FE is live — see deployment-plan Ordering. `set_/clear_household_ai_key` (`security definer`) unaffected. |

No prod-data cutover, no `SET NOT NULL`, no RLS rewrite. Rollback for each migration is in its
file header (`drop trigger` / `drop function` / `drop table` + re-`grant`); no down-migrations.

## Version calculation

No semver in `package.json` (`0.0.0`), no git tags — releases are `dev` -> `main` PR merges.
Synthetic label: `v0.8.0` (intent 008, first ship) + `-1e20c9f` (intent-008 commit short SHA).

## Build environment

- OS: Windows 11 (win32 10.0.26200) · Node v22.14.0 · pnpm (Netlify pins `PNPM_VERSION`,
  `NODE_VERSION = 22` in `netlify.toml`)
- Deno 2.9.6 (Edge Function tests + `deno check`)
- Supabase CLI 2.116.0 via `npx --yes supabase` (local stack + linked push)
- `@anthropic-ai/sdk` pinned `0.122.0` (unchanged; FR-4 only passes `timeout` / `maxRetries: 0`)

## Verification (against committed HEAD 1e20c9f, on `dev`)

| Check                                             | Result                                                                                                                                                 | When              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `deno test --allow-env` (claude-proxy)            | ✅ **33/33** (pipeline + `anthropic.test.ts`)                                                                                                          | 2026-09-01T00:20Z |
| `deno check` / `deno lint` (claude-proxy sources) | ✅ clean                                                                                                                                               | 2026-09-01T00:20Z |
| `npx supabase test db` (pgTAP, local Docker)      | ✅ **PASS — 240 tests / 16 files** (incl. `ai_call_counter_test` 17/17, `ai_config_provenance_test` 13/13; `ai_config_and_key_vault_test` still 36/36) | 2026-09-01T01:05Z |
| `npx supabase migration up --local`               | ✅ both migrations apply clean on the local dev DB                                                                                                     | 2026-09-01T01:00Z |
| `npx vitest run` (full repo)                      | ✅ **178/178 / 25 files**                                                                                                                              | 2026-09-01T01:05Z |
| `npx tsc -b`                                      | ✅ exit 0                                                                                                                                              | 2026-09-01T01:05Z |
| `npx vite build`                                  | ✅ built, `sw.js` + Workbox precache generated                                                                                                         | 2026-09-01T01:05Z |
| `eslint .` / `prettier --check`                   | ✅ 0 errors (1 pre-existing `no-explicit-any` warn in `anthropic.ts`, from 007)                                                                        | 2026-09-01T01:05Z |

No prod-data rehearsal was run — both migrations are purely additive (no data cutover, no
constraint tightening), so the local `db reset` + `test db` path is sufficient coverage. The
one operational risk is the deploy **ordering** (see deployment-plan), not the SQL.

## Prod migration gap (linked `gpkqsedtlzxczmarxjia`)

Before this build: remote current through `20260831130000_ai_config_and_key_vault` (intent 007).
Pending: `20260831213000`, `20260901000000` — pushed 2026-09-01 (see deployment-plan).

## Post-build addition (2026-09-01) — commit `ec41f22`

A **third** migration, `20260901120000_ai_config_write_rpc.sql`, landed after this build as a
Checkpoint-4 fix: model/limit settings writes → `security definer` RPCs
(`set_ai_model_override` / `set_ai_daily_call_limit`), because the as-built `.upsert()`
`42501`'d on prod against `household_ai_config`'s column-only grants. Verified local
(`supabase test db` 256/256, `vitest` 180/180, `tsc`/`eslint`/`prettier` clean, `deno` 33/33),
pushed to prod, FE merged to `main`, verified on the live site. Synthetic label for the fix:
`v0.8.1-ec41f22`. See `deployment-plan.md` → "Post-deploy fix" and `standards/decision-index.md`
ADR-6.
