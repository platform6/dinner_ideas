---
intent: 008-claude-proxy-review-remediation
build: v0.8.0-1e20c9f
commit: 1e20c9f
created: '2026-09-01T02:30:00Z'
updated: '2026-09-01T18:10:00Z'
status: production-live
post_deploy_fixes:
  - '20260901120000_ai_config_write_rpc.sql — model/limit writes -> security-definer RPCs (fixes 42501 on .upsert). DB pushed to prod 2026-09-01T17:35Z; FE fix ec41f22 merged to main -> Netlify rebuilt. Verified on prod 2026-09-01: model change 200, daily-limit change 200, Test connection OK.'
current_checkpoint: 4
pr: 'dev -> main merged 2026-09-01 (also carries 79ea34c — 009/010 inception drafts, no code)'
environments:
  dev: { status: verified, target: 'local Docker Supabase + deno test + vitest + vite build' }
  staging:
    { status: 'n/a — additive migrations, no live staging env; local db reset/test db is the rehearsal' }
  production:
    status: 'live — DB + Edge Function pushed 2026-09-01; FE via Netlify on main'
    db: 'both migrations applied to gpkqsedtlzxczmarxjia (supabase db push --linked, 2026-09-01) — ai_call_counter + reserve_ai_call; provenance trigger + updated_at/updated_by revoke'
    edge_function: 'claude-proxy deployed to gpkqsedtlzxczmarxjia 2026-09-01 (script ~1.6 MB)'
    fe: 'live — Netlify main deploy green 2026-09-01 (ordering hazard window closed)'
    smoke: pending
    target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main'
---

# Deployment Plan: 008-claude-proxy-review-remediation

## Scope

One release, three surfaces:

1. **DB** — `20260831213000_ai_call_counter.sql` + `20260901000000_ai_config_provenance.sql`
   -> `supabase db push --linked`
2. **Edge Function** — `claude-proxy` -> `supabase functions deploy claude-proxy`
3. **FE** — `dev` -> `main` merge -> Netlify production build (FR-5 stale-field fix, FR-5
   `callClaude` `AbortController`, FR-6 `updateAiConfig` no longer sends `updated_at`)

All three are **additive / backward-tolerant** except one ordering hazard (below). No
prod-data cutover, no `NOT NULL`, no RLS rewrite.

## Ordering hazard — provenance revoke vs. old frontend

`20260901000000` **revokes `insert/update (updated_at, updated_by)` on `household_ai_config`
from `authenticated`**. The pre-008 frontend's `updateAiConfig` still sends
`updated_at: new Date().toISOString()` in its `.upsert`, so once the migration is live, an
owner editing **Model** or **Daily call limit** on `/settings` gets a 403
("Couldn't update…") **until the new FE is deployed**. Impact window = between the DB push and
the Netlify `main` build going live.

- Not affected: key set/clear (`security definer` RPCs), Test connection, everything else.
- Mitigation: the FE change is small and Netlify builds automatically on the `main` merge; the
  window is minutes. If the merge preceded the DB push (it did — "just merged" then push),
  the reverse order also leaves a short window (new FE would still work — it doesn't send
  `updated_at` — so merge-first is actually the safer order here).
- Fully closed once the Netlify `main` build is live. **Closed 2026-09-01** — `main` deployed
  on Netlify (user-confirmed).

## Progression

```
[x] Dev       — local: deno 33/33, pgTAP 240/240, vitest 178/178, tsc, vite build   (2026-09-01)
[x] Staging   — n/a. Additive migrations; local `db reset` + `test db` is the rehearsal.
[x] Production — 2026-09-01
    [x] merge dev -> main  (FE build triggered on Netlify)
    [x] `npx --yes supabase db push --linked`  — both migrations applied to gpkqsedtlzxczmarxjia
        output: {"migrations":["20260831213000_ai_call_counter.sql","20260901000000_ai_config_provenance.sql"],"message":"Finished supabase db push."}
    [x] `npx --yes supabase functions deploy claude-proxy --project-ref gpkqsedtlzxczmarxjia`
        output: {"functions":["claude-proxy"],"message":"Deployed Functions."}
[~] Verify production — Checkpoint 4  (in progress)
    [x] Netlify `main` build GREEN and live  (2026-09-01, user-confirmed)
    [x] `supabase migration list --linked` — 20260831213000 / 20260901000000 / 20260901120000
        all remote  (2026-09-01)
    [x] database.types.ts regenerated + committed (ai_call_counter, reserve_ai_call,
        set_ai_model_override, set_ai_daily_call_limit)
    [~] Smoke (see below)
        [x] Model change -> 200; Daily call limit change -> 200; Test connection OK
            (2026-09-01, user-confirmed — the S1/S2/S6 paths + the 42501 fix)
        [ ] S3 cap: set limit 3, clear today's ai_call_counter, press Test connection 4x
            -> 3 OK + "Daily limit reached"; counter row (HH, today, 3)
        [ ] S4 raw PATCH updated_at -> 403  ·  S5 clear key -> "No Claude API key set…"
        [ ] S2 DB check: updated_by = owner uid, updated_at ~ now
    [ ] `get_advisors` (security + perf) from the Supabase dashboard — expect no new ERROR;
        the 4 new `security definer` fns pin `search_path = ''` + grant `execute` narrowly
        (mirrors 007), so no new `function_search_path_mutable` / definer-executable WARN
        expected.
```

## Smoke (Checkpoint 4)

Run as a household **owner** with a valid Anthropic key on `/settings`. Full matrix is in the
manual acceptance tests (session note); the deploy-confirmation subset:

| #   | Check                                                                                                                                                                                                             | Pass                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `/settings`: set **Daily call limit** = 5, save, reload                                                                                                                                                           | field shows **5** (not 25) — FR-5                                                                                                      |
| S2  | `/settings`: change **Model**; `select updated_by, updated_at from household_ai_config where household_id='HH'`                                                                                                   | `updated_by` = your uid, `updated_at` ≈ now — FR-6                                                                                     |
| S3  | SQL: `update household_ai_config set daily_call_limit=3 where household_id='HH'; delete from ai_call_counter where household_id='HH' and day=(now() at time zone 'utc')::date;` then press **Test connection** 4× | 3 OK, 4th "Daily limit reached"; `ai_call_counter` row = `(HH, today, 3)`; `ai_usage_log` = 3 `ok=true` + 1 `rate_limited` — FR-1/FR-2 |
| S4  | Raw PostgREST PATCH setting `updated_at` on `household_ai_config` (curl)                                                                                                                                          | **403** — column revoked — FR-6                                                                                                        |
| S5  | Clear the household key -> **Test connection**                                                                                                                                                                    | "No Claude API key set…" — contract regression check                                                                                   |
| S6  | Normal **Test connection** with key                                                                                                                                                                               | 200; body has `{ text, model, usage, latency_ms }`; exactly one `ai_usage_log` row per press                                           |

Not manually reproducible (covered by automated tests): transient-DB-error fail-closed
(FR-1/FR-3 resolver paths), concurrent cap race (FR-2), real SDK timeout + post-billing
metering-write failure (FR-4). If the proxy ever is slow, the expected outcome is `502
timeout` **with** an `ai_usage_log` row, before the platform kills the function.

## Rollback (emergency only — no data loss)

- **FE**: redeploy the previous Netlify production deploy (instant). Old FE + new schema
  works for reads/Test connection; only model/limit edits 403 (see Ordering hazard).
- **Edge Function**: `supabase functions deploy` the previous `claude-proxy` from the
  pre-008 commit. Old function + new schema is fine — it simply doesn't call
  `reserve_ai_call` (falls back to the old `count(*)` cap).
- **DB**: per each migration's header —
  - `20260901000000`: `drop trigger trg_household_ai_config_provenance …; drop function
stamp_household_ai_config_provenance(); grant insert/update (updated_at, updated_by) …
to authenticated;`
  - `20260831213000`: `drop function reserve_ai_call(uuid,integer); drop table
ai_call_counter;`
    Both are non-destructive to existing data (`ai_call_counter` holds only per-day counters).
- No down-migrations; roll **forward** (fix + re-push) unless a migration itself failed to
  apply.

## Post-deploy fix (2026-09-01) — `.upsert()` on `household_ai_config` → 42501

**Symptom (found during Checkpoint 4 smoke, S1/S2):** as a confirmed household **owner**
(`platform.six@gmail.com`, founding household), changing **Model** or **Daily call limit** on
`/settings` returned `403 { code: 42501, message: "permission denied for table
household_ai_config", hint: "GRANT UPDATE ON public.household_ai_config TO authenticated" }`.
Save key and Test connection were unaffected.

**Cause (latent since intent 007, not introduced by 008):** `updateAiConfig` did a PostgREST
`.upsert()` = `INSERT … ON CONFLICT DO UPDATE`. `household_ai_config` has **column-level
grants only** for `authenticated` (no table-level `INSERT`/`UPDATE`) so an owner cannot
repoint `key_secret_id` (ADR-4); 008 then revoked `UPDATE(updated_at, updated_by)` on top. On
prod's PostgREST, the `ON CONFLICT DO UPDATE` form needs **table-level `UPDATE`** privilege,
which the role lacks → 42501. (Locally it happened to pass — a PostgREST-version difference.)
The write path was never exercised end-to-end against real grants: `007`/`008` tests mock
`updateAiConfig` or use `security definer` RPCs.

**Fix — `20260901120000_ai_config_write_rpc.sql` + `settings/api.ts`:** move model/limit
writes to two `security definer` RPCs, `set_ai_model_override(text)` /
`set_ai_daily_call_limit(integer)` — same pattern as `set_household_ai_key`. Each resolves the
household server-side, checks the caller is `owner` (`raise 42501` otherwise), validates
(allowlist / non-negative → `22023`), and does the `insert … on conflict do update`; the
`stamp_household_ai_config_provenance` trigger still records provenance. `execute` granted to
`authenticated` only. `updateAiConfig` now `.rpc(...)` (no client `householdId` arg);
`ClaudeAiCard` drops the unused `householdId`. The `20260901000000` column-revoke stays (now
pure defense — the client no longer touches those columns).

Verified (local, `dev`):

| Check                                | Result                                                                                  | When              |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ----------------- |
| `npx supabase test db`               | ✅ PASS — 256 tests / 17 files (new `ai_config_write_rpc_test` 16/16)                   | 2026-09-01T17:20Z |
| `npx vitest run`                     | ✅ 180/180 / 25 files                                                                   | 2026-09-01T17:20Z |
| `npx tsc -b` / `eslint` / `prettier` | ✅ clean                                                                                | 2026-09-01T17:20Z |
| `deno test` (claude-proxy)           | ✅ 33/33 (untouched)                                                                    | 2026-09-01T17:20Z |
| `database.types.ts`                  | regen (`--local`) — adds `set_ai_model_override` / `set_ai_daily_call_limit` signatures |                   |

Deploy: `npx --yes supabase db push --linked` (migration `20260901120000`) + Netlify rebuild
on the `main` merge. No Edge Function change. Rollback: `drop function
set_ai_model_override(text), set_ai_daily_call_limit(integer)` + revert `settings/api.ts` to
the `.upsert()` form.

## Notes / deviations

- No container/registry artifact; DB "artifact" = the committed SQL, FE built by Netlify on
  push, function bundled by the Supabase CLI.
- Lower-risk deployment than intent 004 — no prod-data cutover — so no separate prod-data
  rehearsal checkpoint; `db reset` + `test db` locally is the rehearsal.
- The `main` merge also carried commit `79ea34c` (009/010 inception drafts) — **docs only**,
  no code or migration, no deployment impact.
