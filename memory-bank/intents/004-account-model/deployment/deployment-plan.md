---
intent: 004-account-model
build: v0.4.0-f819f32
commit: f819f32
created: '2026-08-29T20:33:00Z'
updated: '2026-08-31T14:25:00Z'
status: production-live-fe-smoke-pending
current_checkpoint: 4
pr: 'https://github.com/platform6/dinner_ideas/pull/8 (merged -> main 9af3d99)'
prod_commit: b1f86be
environments:
  dev: { status: verified, target: 'local Docker Supabase + local vite build' }
  staging:
    {
      status: verified,
      fe-preview: green,
      db-rehearsal: 'green (prod-data, after fix)',
      target: 'Netlify deploy preview + local prod-data rehearsal',
    }
  production:
    {
      status: 'live — DB pushed 2026-08-31T14:18Z, FE on main via Netlify',
      db: 'all 5 migrations remote; founding household "Home" owner platform.six@gmail.com; row counts match rehearsal, 0 null household_id',
      fe-smoke: pending,
      target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main',
    }
---

# Deployment Plan: 004-account-model

## Scope

One release, two surfaces, pushed **together** (ADR-3: a partial migration push leaves the
app non-functional — nullable `household_id` + household-scoped RLS = nothing visible):

1. **DB** — migrations `20260828230000 .. 20260828234000` -> `supabase db push --linked`
2. **FE** — `dev` -> `main` PR merge -> Netlify production build

## Progression

```
[x] Dev      — local Docker: pgTAP 165/165, vitest 148/148, tsc, vite build  (2026-08-29)
[x] Staging  — Checkpoint 2  (2026-08-31)
    [x] 2b FE — PR #8 dev->main; Netlify deploy-preview build GREEN
             https://deploy-preview-8--dinnerideas.netlify.app
             build+bundle sanity only — preview points at prod Supabase (old schema)
    [x] 2a DB — prod-data rehearsal GREEN after 2 migration fixes (see below)
[x] Verify staging   — n/a (rehearsal IS the staging verify; no live staging env)
[x] Production — Checkpoint 3  (2026-08-31)
    NOTE: PR #8 was merged to main (FE) BEFORE the DB push — ~short interim window of
    new-FE-on-old-schema (household context load + add-tag + assign-category were broken;
    reads unaffected). Closed by the DB push below.
    - fixes committed b1f86be, pushed; PR #8 Netlify preview re-verified green
    - preflight: prod auth.users = 1 row platform.six@gmail.com (matches retargeted migration);
      5 migrations pending, nothing else drifted
    - `supabase db push --linked` 2026-08-31T14:18Z — all 5 applied, migration 5 took the
      real resolve-by-email path (no RAISE, no bootstrap)
[x] Verify production  (2026-08-31)
    - `supabase migration list --linked` — all 5 now remote
    - fresh `supabase db dump --linked` (post-push): households=1 name "Home",
      owner platform.six@gmail.com role owner; weekly_plans 3 (2 locked, incl. 8c0c1664
      that broke the pre-fix migration) all on founding household; dashboard count check
      = dinners 50 / tags 4 / weekly_plans 3 / meal_history 6 / grocery_store_rows 6 /
      category_row_assignments 5, all 0 null household_id
    - `supabase gen types typescript --linked` vs committed database.types.ts — no schema
      drift (only quote-style + a new __InternalSupabase metadata block from a newer CLI)
[~] Monitor  — Checkpoint 4
    [ ] FE smoke on live site as platform.six@gmail.com (catalog/plan/shopping/cooking/
        store-config render; add-tag + assign-category work again; no household-context
        console error)
    [x] advisors run from Supabase dashboard (2026-08-31T14:51Z): 0 ERROR, 0 perf.
        12 WARN/security, all triaged:
          - function_search_path_mutable ×6 — pre-004 funcs (weekly-planning + reorder).
          - anon/authenticated_security_definer_function_executable ×4 —
            current_user_household_id() (RLS resolver; grants intentional, kept) +
            rls_auto_enable() (untracked prod-only event-trigger func).
          - auth_leaked_password_protection — dashboard Auth toggle (do before public signup).
        -> follow-up migration 20260831120000_advisor_hardening.sql (+ pgTAP): pins
           search_path on the 6 funcs; drops rls_auto_enable() (+ any bound event trigger);
           leaves current_user_household_id grants as-is (documented). Local: db reset +
           test db 174/174 green. NOT yet on prod — needs its own `supabase db push --linked`
           + a dev->main PR; re-run advisors after.
    [ ] apply 20260831120000 to prod + re-run advisors
    [ ] enable leaked-password protection (dashboard) — before opening public signup
    [ ] optional: regen database.types.ts with current CLI + commit (cosmetic)
```

> ## ✅ Checkpoint 2a — prod-data rehearsal (2026-08-31)
>
> Local Docker scratch DB seeded from `supabase db dump --linked` (prod `public` schema +
> data + `auth.users`), then the 5 pending migrations applied in order. **First two runs
> failed; both fixed in `20260828234000`; third run green.**
>
> ### Blocker 1 — founding-owner email mismatch (FIXED)
>
> Migration hard-coded `garrett.peter.conn@gmail.com`; prod `auth.users` has exactly one
> row, `platform.six@gmail.com` (id `086bba35-…`, active through 2026-08-30). The
> "never guess an owner" `RAISE` branch aborted migration 5.
> **Fix:** retargeted to `platform.six@gmail.com` in
> `20260828234000_account_model_founding_household.sql` (lines 9, 53, 60, 74; household
> name line 84 `'Conn household'` → `'Home'`) and
> `account_model_founding_household_test.sql` line 22.
>
> ### Blocker 2 — locked weekly_plans block the household_id backfill (FIXED)
>
> The backfill `update public.weekly_plans set household_id = … where household_id is null`
> tripped the pre-existing `trg_weekly_plans_block_edit_after_lock` trigger (migration
> `20260826192038`) — prod has 2 locked plans. Never seen locally (empty `weekly_plans`
> after `db reset`).
> **Fix:** the backfill now wraps the 6 updates in
> `alter table public.weekly_plans disable trigger trg_weekly_plans_block_edit_after_lock;`
> … `enable trigger …` (table owned by `postgres`, so no extra privilege; whole migration
> is one txn; re-run returns early before this block).
>
> ### Green run — post-migration state (matches pre-migration prod)
>
> | table                                                      | rows          | null household_id | on founding household |
> | ---------------------------------------------------------- | ------------- | ----------------- | --------------------- |
> | dinners                                                    | 50            | 0                 | 50                    |
> | tags                                                       | 4             | 0                 | 4                     |
> | weekly_plans                                               | 3 (2 locked)  | 0                 | 3                     |
> | meal_history                                               | 6             | 0                 | 6                     |
> | grocery_store_rows                                         | 6             | 0                 | 6                     |
> | category_row_assignments                                   | 5             | 0                 | 5                     |
> | dinner_ingredients / dinner_steps / weekly_plan_selections | 284 / 216 / 9 | —                 | (via parent)          |
>
> - founding household `00000000-0000-4000-8000-000000000001` name `Home`, owner
>   `platform.six@gmail.com` role `owner`
> - `category_row_assignments` PK promoted to `(household_id, category)`
> - `trg_weekly_plans_block_edit_after_lock` re-enabled (`tgenabled = O`)
> - founding migration took the **real production path** (resolve-by-email) — no `RAISE`,
>   no bootstrap notice
>
> ### Post-fix full verification (local, `dev` working tree — NOT yet committed)
>
> - `supabase db reset` (bootstrap path, synthetic `platform.six@gmail.com`) — clean
> - `supabase test db` — 12 files / **165 tests** PASS
> - `npx vitest run` — 22 files / **148 tests** PASS
> - `npx tsc -b` — exit 0 · `npx vite build` — built 4.88s, `sw.js` generated
>
> **Uncommitted changes on `dev`:** `20260828234000_account_model_founding_household.sql`,
> `account_model_founding_household_test.sql`, this file, `build.md`.
> `f819f32` (in PR #8) still has the OLD migration — **must recommit + push before
> Checkpoint 3**, then re-confirm PR #8's Netlify preview.

---

## Checkpoint 2 — Staging

### 2a. Database — Supabase branch dry-run

`supabase` branches apply migrations to a **fresh** DB; **production data does not carry
over**. Two options, pick one:

| Option                                | What it proves                                                                                                                                                                                                                     | Effort                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **A. Plain branch** (`create_branch`) | migrations apply cleanly in order on top of the shipped seed; founding migration takes its _bootstrap_ branch (empty `auth.users`) and stamps the ~50 seeded dinners. Mechanical validation only — same coverage as local pgTAP.   | low (MCP `create_branch`, then run pgTAP against the branch ref)                                                   |
| **B. Prod-data rehearsal**            | migrations apply against a **copy of real prod data** — real row counts, real curation, the _real-user_ founding path (`garrett.peter.conn@gmail.com` resolved, not bootstrapped). This is the rehearsal ADR-3 actually calls for. | med — `pg_dump` linked prod -> load into a scratch Postgres / branch -> `supabase db push` -> pgTAP + manual check |

Recommendation: **B** (or A then B). The founding cutover is the one-shot risk; only B
exercises its production code path.

Pass criteria:

- all 5 migrations apply with no error, in timestamp order
- `20260828234000` resolves the founding owner **by email** (no `RAISE`, no bootstrap notice)
- post-migration: founding user sees unchanged data — `select count(*)` on `dinners`,
  `weekly_plans`, `meal_history`, `grocery_store_rows`, `tags`, `category_row_assignments`
  match pre-migration counts, all with `household_id = 00000000-0000-4000-8000-000000000001`
- pgTAP suite green against the migrated branch

### 2b. Frontend — Netlify deploy preview

- open PR `dev` -> `main` on `github.com/platform6/dinner_ideas`
- Netlify builds a deploy-preview automatically; confirm the preview build is green
  (`pnpm run build`, `NODE_VERSION=22`, `PNPM_VERSION=11.1.3`, `HUSKY=0`)
- the preview points at **prod** Supabase (no per-env config), so it can't be exercised
  end-to-end until 2a's migrations are also on prod — treat 2b as "build + bundle sanity"
  only, full FE verification happens in prod verify

---

## Checkpoint 3 — Production

### Preflight (MUST pass before `db push`)

1. **Founding owner exists** — `select id, email from auth.users where lower(email) =
'garrett.peter.conn@gmail.com'` on prod returns exactly one row.
   _(Not yet checked — direct prod `auth.users` query was blocked by the permission
   classifier this session. Run via dashboard SQL editor or an approved path.)_
2. **No extra auth users** — if `count(*) from auth.users > 1` and any is not the founding
   email, ADR-3 says those rows are left membership-less and must be attached by hand;
   decide before pushing.
3. Prod DB backup / PITR confirmed available (Supabase daily backup or on-demand).
4. `supabase migration list --linked` still shows exactly the 5 pending, nothing else drifted.

### Execute (single window, DB first)

```
supabase db push --linked          # applies 20260828230000 .. 234000
# then
merge PR dev -> main               # Netlify production build + deploy
```

DB before FE: the new frontend (`f819f32`, household-aware `useAuth`, composite
`onConflict` upserts) assumes the new schema. Old frontend + new schema is fine for the
minutes in between (RLS still resolves the founding household for the existing session).

### Rollback (emergency only — data retained)

Per `20260828234000` header + ADR-3. No down-migrations exist; forward-only. If the push
half-fails or the app breaks:

- **FE**: revert the `main` merge / redeploy previous Netlify production deploy (instant).
- **DB**: the founding migration documents a manual reversal in its header comment — drop
  `not null` on the 6 `household_id` columns, restore the `category_row_assignments`
  interim unique, null out the founding `household_id` values, delete the founding
  `household_members` / `households` rows. **Existing row data is never deleted.** For a
  clean-room recovery, restore from the pre-push backup / PITR to just before the push.
- Because the 5 migrations are one logical unit, a partial apply should be resolved by
  rolling _forward_ (fix + re-push; the founding migration's idempotency guard makes a
  re-run safe) rather than unwinding, unless `20260828234000` itself is the failure.

---

## Checkpoint 4 — Verify prod & Monitor

- `supabase gen types typescript --linked > src/shared/lib/database.types.ts`; expect no
  diff vs the committed (local-generated) file; `tsc -b` clean. Commit if it differs.
- `supabase migration list --linked` — all 5 now show a remote timestamp.
- Smoke: log in as founding user on the live site — catalog, weekly plan, shopping list,
  cooking view, store config all render unchanged.
- New-signup smoke (if public signup is being enabled now): create a throwaway account ->
  `handle_new_user()` provisions a fresh seeded household (50 dinners) -> that account sees
  only its own data, not the founding household's.
- `get_advisors` (security + performance lint) on the linked project post-migration.
- Monitoring: Supabase project dashboard (DB health, auth), Netlify deploy notifications.
  No external observability stack in this project today — Checkpoint 4 = confirm dashboards
  - set a manual watch on the first real signups.

---

## Notes / deviations from the generic build skill

- No container/registry artifact — Netlify builds the FE bundle itself on push; the DB
  "artifact" is the committed SQL migration set.
- No semver / git tags in this repo; releases are `dev` -> `main` PR merges. `v0.4.0-f819f32`
  is a synthetic label for this deployment record only.
