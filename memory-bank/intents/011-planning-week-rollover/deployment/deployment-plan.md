---
intent: 011-planning-week-rollover
release: v0.9.0-58579d7
commit: 58579d7
bundles: [012-explicit-plan-locking, 011-planning-week-rollover, 009-clear-picks-reset]
created: '2026-09-04T02:56:24Z'
updated: '2026-09-04T03:30:00Z'
status: production-live
current_checkpoint: 4
environments:
  dev:
    status: verified
    target: 'local — vitest 222/222, tsc -b, eslint, pnpm run build (Netlify cmd)'
  staging:
    status: 'n/a — one additive column, FE-only otherwise; local test/build is the rehearsal (same call as intent 008)'
  production:
    status: 'live 2026-09-04'
    target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main'
    db: 'APPLIED 2026-09-04 — 20260904020000_households_week_start_day.sql (supabase db push --linked)'
    fe: 'LIVE 2026-09-04 — PR #14 merged (origin/main 664d78c); Netlify main build green (user-confirmed)'
    edge_function: 'n/a — no function change'
    smoke: 'S1–S8 all pass on prod (2026-09-04, user-confirmed) — planning-week card + owner gate, window label parity, fresh-week empty state, week-aligned pick persistence, lock flow + history, shopping-list decoupling, clear picks + ordered undo'
---

# Deployment Plan: intents 012 + 011 + 009 (release v0.9.0)

One release, one merge. `origin/main..dev` is exactly 5 commits:

| Commit    | Contents                                | Deploy surface       |
| --------- | --------------------------------------- | -------------------- |
| `6a9c575` | intent 008 deploy record                | docs only            |
| `d7d4eae` | intent 008 artifact sync                | docs only            |
| `6846afb` | **intent 012 — explicit plan locking**  | FE only              |
| `3b9ee93` | **intent 011 — planning-week rollover** | FE + **1 migration** |
| `58579d7` | **intent 009 — clear picks**            | FE only              |

## Scope

- **DB** — `supabase/migrations/20260904020000_households_week_start_day.sql`:
  `alter table public.households add column if not exists week_start_day smallint not null
default 0 check (week_start_day between 0 and 6)` + a column comment. **No new RLS** — the
  existing `households` member-SELECT / owner-UPDATE policies (`20260828230000`) cover it.
  Existing rows read `0` (Sunday) via the default.
- **FE** — `dev → main` merge → Netlify production build. Ships:
  - 012: `LockWeekControl` on `/plan`; locking removed from the Shopping List Copy flow;
    "not locked in yet" note; locked-banner reword.
  - 011: `/settings` "Planning week" card; week-aware `useCurrentPlan`; catalog planning-window
    label; rollover-on-open; week-aligned `createPlan`.
  - 009: `ClearPicksControl` in the catalog header; `clearSelections` + undo bar.
- **Edge Function** — none.
- **Dependencies** — none added.

## Ordering hazard — new FE vs. old DB (harmless), old FE vs. new column (harmless)

- **`20260904020000` before the FE is live:** the column exists with default `0`; the old FE
  never reads or writes it. No effect.
- **New FE live before `20260904020000` is applied:** `fetchWeekStartDay` selects a column
  that does not exist yet → PostgREST 400 → `useWeekStartDay` errors → `useCurrentPlan` stays
  disabled → the catalog/plan sit in a loading state and the `/settings` "Planning week" card
  shows its load error. **User-visible breakage.** → **Apply the migration first, or in the
  same window as the Netlify build.** Recommended order below puts the DB push first.
- No `NOT NULL` backfill, no data cutover, no RLS rewrite — nothing destructive.

## Progression

```
[x] Dev
    [x] vitest        222/222  (29 files)                       2026-09-04
    [x] tsc -b        clean
    [x] eslint        clean
    [x] pnpm run build (Netlify's exact command)  clean         2026-09-04
[x] Staging   — n/a. One additive column + FE. `pnpm test` + `pnpm run build` locally is the
              rehearsal (same call as intent 008's additive migrations).
[ ] Production — Checkpoint 3 (user approval required)
    [x] 0. push local dev  →  `git push origin dev`   (done 2026-09-04 — e14b51b..58579d7)
    [x] 1. DB:  `npx --yes supabase db push --linked`   (done 2026-09-04)
           output: {"migrations":["20260904020000_households_week_start_day.sql"],"message":"Finished supabase db push."}
           `migration list` pre-check: 20260904020000 was local-only (remote:"") — now applied.
    [x] 2. FE:  PR #14 merged 2026-09-04 → origin/main 664d78c → Netlify building.
           origin/main..dev is now empty (dev/main in sync).
    [~] 3. regen types from prod:
           `npx --yes supabase gen types typescript --linked > src/shared/lib/database.types.ts`
           No-op expected (hand-added `households.week_start_day: number` matches the one
           additive column). Non-blocking — run at leisure; if it diffs, commit to `dev`.
[x] Verify production — Checkpoint 4  (2026-09-04)
    [x] `supabase db push --linked` output confirms 20260904020000 applied; pre-check
        `migration list` showed it local-only before the push
    [x] Netlify `main` build GREEN and live  (2026-09-04, user-confirmed)
    [x] Smoke S1–S8 — all pass on prod (2026-09-04, user-confirmed)
    [ ] `get_advisors` (security + performance) from the Supabase dashboard — recommended,
        non-blocking. One additive column on an already-RLS'd table; no advisory expected.
        Not yet run.
```

## Smoke (Checkpoint 4)

Run as a household **owner** on prod.

| #   | Intent | Check                                                                  | Pass                                                                                                                                                                              |
| --- | ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | 011    | `/settings` → "Planning week" card visible; change the weekday, reload | card shows the new weekday; `select week_start_day from households where id='HH'` matches                                                                                         |
| S2  | 011    | as a **non-owner** member, open `/settings`                            | "Planning week" select is disabled + "Ask a household owner…"                                                                                                                     |
| S3  | 011    | Catalog header                                                         | shows a `M/D – M/D` range matching `/plan`'s current-week label                                                                                                                   |
| S4  | 011    | With no plan for the current planning week, open the catalog           | "0 of 3", no dinners pre-selected (no stale older-week picks)                                                                                                                     |
| S5  | 011    | Pick a dinner on a fresh week, reload                                  | the pick persists (`select start_date from weekly_plans order by created_at desc limit 1` = the planning-week start, not today)                                                   |
| S6  | 012    | `/plan` with 3 picks, unlocked                                         | "Lock in this week" button; press → inline confirm → "Lock it in" → locked banner "…locked in — saved to your history."; `select locked_at, (…meal_history rows) …` written       |
| S7  | 012    | Shopping List page                                                     | no "Also lock this week's plan" checkbox; Copy shows plain "Copied!"; for an unlocked 3-pick week, the "not locked in yet" note links to `/plan`                                  |
| S8  | 009    | Catalog with 1–3 picks                                                 | "Clear picks" → "Clear all N?" → "Clear all" → grid empties, undo bar "N dinner(s) cleared."; "Undo" restores the same 1/2/3 order; leaving the catalog drops the bar (permanent) |

Not manually reproducible (covered by automated tests): the `planningWeekStart` DST/boundary
math (`date.test.ts`), the `useClearSelections` / `useRestoreSelections` ordering
(`clear-selections.test.ts`), and the 4-consumer `useCurrentPlan` audit.

## Rollback (emergency only — no data loss)

- **FE**: redeploy the previous Netlify production deploy (instant). The pre-release FE does
  not know about `week_start_day` and behaves as before. Safe.
- **DB**: `alter table public.households drop column if exists week_start_day;` — the column
  holds only a per-household preference (all `0` unless an owner changed it); dropping it
  loses nothing else. Then redeploy the old FE (which doesn't read it) — or roll forward.
- No down-migrations; prefer roll-forward (re-push) unless the migration itself failed to
  apply.

## Notes / deviations

- No container/registry artifact — DB "artifact" is the committed SQL; FE built by Netlify on
  the `main` push; no Edge Function.
- Anchored under intent `011` because it is the only surface with a migration; `012` and
  `009` are FE-only riders in the same merge (same pattern as intent 008 carrying the
  `009`/`010` inception drafts).
- `database.types.ts` currently carries a **hand-added** `households.week_start_day` (no local
  `supabase` CLI at construction time). Step 3 above replaces it with the authoritative
  regen-from-prod; the diff should be empty if the hand-add was correct.
- Local `main` ref was stale during planning; `origin/main` = `0e7cf01` (PR #13). All five
  unreleased commits are on local `dev`, **not yet pushed to `origin/dev`** — step 0.
