---
intent: 015-dinners-per-week
release: v0.12.0-1223ed7
commit: 1223ed7
units: [001-dinners-per-week-model, 002-plan-flow-variable-n]
created: '2026-09-08T21:35:00Z'
updated: '2026-09-08T21:35:00Z'
status: build-approved
current_checkpoint: 1
follows: v0.11.2-44542b4
environments:
  dev:
    status: verified
    target: 'local — pgTAP 370/370 on clean-slate reset, vitest 331/331, tsc -b, eslint, vite build'
  staging:
    status: 'pending decision — Checkpoint 2'
  production:
    status: 'not started'
    target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main'
---

# Deployment Plan: intent 015 — dinners per week (release v0.12.0)

Current production is **v0.11.2** (`origin/main` @ `050b410`, PR #19, live 2026-09-08).

## Scope

- **DB — one migration.** `20260908190000_dinners_per_week.sql`, confirmed not applied.
- **FE** — `dev → main` → Netlify. A new `/settings` control, and seven files reading the setting.
- **Edge Function** — none. **RLS** — none.

## Ordering — it matters again

v0.11.1 was frontend-only and v0.11.2 database-only; neither had a real ordering question. **This
one has both halves**, so it returns to the v0.10.0 / v0.11.0 shape.

**Migration first, then merge (safe).** The column appears; nothing on the live v0.11.2 frontend
reads it. No user-visible effect at all.

**FE first, then migration (degrades, does not break).** Worth stating precisely, because the
answer is milder than previous releases:

- `/settings`' Planning week card calls `.select('dinners_per_week')` → PostgREST 400 → the card
  shows "Couldn't load the planning-week settings." Visibly broken, but contained to that card.
- **Every other screen degrades silently to 3.** `useDinnersPerWeek()` fails, and each call site
  uses `?? 3` — the column default. The catalog, plan, shopping list and cooking view behave
  exactly as they do today.

That fallback was written for first-render, not for a missing column, but it happens to make the
wrong order survivable. It is not a licence to get the order wrong.

→ **Apply the migration first, then merge.** Same as v0.10.0 and v0.11.0.

## ⚠ The types are ahead of production

`database.types.ts` was regenerated from `--local` in bolt 064, because the column exists only
locally until this migration ships. **Do not run `supabase gen types --linked` before applying the
migration** — it would remove `dinners_per_week` from the types and break `tsc` and the Netlify
build.

After the deploy, a `--linked` regen is safe again and will also restore the `__InternalSupabase`
block the local generator omits. Not required.

## Rollback

**Symmetric while the frontend is not live**; conditional after.

- Before the merge: restore the literal-3 function bodies (**restating `set search_path = ''`** in
  each — ADR-12), swap the trigger back, drop `fn_weekly_plans_require_n_on_lock`, then
  `alter table public.households drop column dinners_per_week`.
- **After the merge, the column drop breaks the client**, which reads it. Rollback becomes
  frontend-revert first (Netlify), then the SQL.

The migration carries this note. A rollback whose safety depends on what else has shipped is worth
reading before an incident.

## Staging — n/a, and the reason is specific again

- **v0.10.0** rehearsed: its cutover had gates that could fail on production's data shape.
- **v0.11.0** skipped: an additive column and backfill cannot fail on data.
- **v0.11.1** skipped: no data or schema at all.
- **v0.11.2** skipped: a widening index change no data shape can fail.
- **v0.12.0**: an **additive column with a default**, plus two function bodies replaced. No
  backfill, no constraint applied to existing rows, no data reshaped. Every existing household
  takes `3` and behaves exactly as before — the deploy is a **no-op until someone changes the
  setting**.

The one thing a staging environment could add is confidence in the trigger rewrite, and pgTAP
already covers that at a non-default N on a clean-slate 25-migration chain, including the
lowered-setting case.

Product owner's call at Checkpoint 2.

## Progression

| Checkpoint | Stage                  | State                  |
| ---------- | ---------------------- | ---------------------- |
| 1          | Build approval         | ✅ approved 2026-09-08 |
| 2          | Staging decision       | ⏳ recommendation: n/a |
| 3          | Production deploy      | ⏳ pending             |
| 4          | Monitoring / close-out | ⏳ pending             |

## Production steps, when approved

1. **`git push origin dev`** — 6 commits are local-only. PR #17 shipped nothing because this was
   missed; the check is that the PR diff shows source files, not only `.md`
2. Apply the migration: `npx supabase db push --linked`
3. **Verify the schema actually changed**, rather than trusting the exit code:
   ```sql
   select column_default, data_type from information_schema.columns
    where table_name='households' and column_name='dinners_per_week';
   select proname from pg_proc where proname like 'fn_weekly_plans_require%';
   -- expect: default 3; _require_n_on_lock present, _require_three_on_lock absent
   ```
4. Open a PR `dev → main` and merge
5. Netlify builds `main`; confirm green
6. **Smoke the feature end to end** — the check no test covers:
   - `/settings` → Planning week → set "Dinners per week" to 5
   - `/` catalog → the badge reads "N of 5"; a fourth dinner is selectable
   - `/plan` → the nudge asks for 5; the lock control appears only at 5
   - `/shopping-list` → gated until 5 are picked
   - Set it back to 3 and confirm nothing looks odd
7. Record the release here and close Checkpoint 4

## Post-deploy

- **Optional**: `supabase gen types typescript --linked` to bring the types back in line with the
  project's usual source, now that production has the column.
- **Advisors** — unchanged practice; the product owner monitors. This release replaces two
  functions but **restates `set search_path = ''` in both** (ADR-12), and
  `advisor_hardening_test.sql` asserts it, so no new `function_search_path_mutable` finding is
  expected. Intent 004's advisor re-run remains outstanding separately.
