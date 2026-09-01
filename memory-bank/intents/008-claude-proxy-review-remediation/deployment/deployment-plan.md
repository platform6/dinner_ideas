---
intent: 008-claude-proxy-review-remediation
build: v0.8.0-1e20c9f
commit: 1e20c9f
created: '2026-09-01T02:30:00Z'
updated: '2026-09-01T03:15:00Z'
status: production-live-smoke-pending
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
    [ ] `supabase migration list --linked` — both new timestamps show remote
    [ ] Smoke (see below)
    [ ] `get_advisors` (security + perf) on the linked project — expect no new ERROR;
        `reserve_ai_call` / `stamp_household_ai_config_provenance` are `security definer`
        with pinned `search_path = ''` and targeted `execute` grants (mirrors 007's fns), so
        no new `function_search_path_mutable` / definer-executable WARN expected.
    [ ] `supabase gen types typescript --linked` vs committed `database.types.ts` — the new
        `ai_call_counter` table means a real diff this time; regen + commit if so.
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

## Notes / deviations

- No container/registry artifact; DB "artifact" = the committed SQL, FE built by Netlify on
  push, function bundled by the Supabase CLI.
- Lower-risk deployment than intent 004 — no prod-data cutover — so no separate prod-data
  rehearsal checkpoint; `db reset` + `test db` locally is the rehearsal.
- The `main` merge also carried commit `79ea34c` (009/010 inception drafts) — **docs only**,
  no code or migration, no deployment impact.
