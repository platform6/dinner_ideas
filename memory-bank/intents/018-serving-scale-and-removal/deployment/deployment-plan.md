---
intent: 018-serving-scale-and-removal
release: v0.15.0-b5ea091
commit: b5ea091
units: [001-serving-size-setting, 002-scale-on-review, 003-remove-a-dinner]
created: '2026-09-11T18:27:24Z'
updated: '2026-09-11T18:27:24Z'
status: planned
current_checkpoint: 1
follows: v0.14.0-fd66c42
environments:
  dev:
    status: verified
    target: 'local — vitest 725/725, pgTAP 446/446 on a local stack with both migrations applied, tsc -b, eslint clean'
  staging:
    status: 'awaiting product owner decision — see "Staging" below'
  production:
    status: not-started
    target: 'Supabase (two migrations) THEN Netlify main'
    db: 'PENDING — 20260911173308_servings_per_dinner.sql and 20260911181346_remove_dinner.sql. Confirmed absent from prod via `supabase migration list` (remote empty for both).'
    fe: 'NOT STARTED — 7 commits unreleased, and `dev` is not pushed.'
    edge_function: 'n/a — claude-proxy unchanged.'
---

# Deployment Plan: intent 018 — scaling and removal (release v0.15.0)

Current production is **v0.14.0** (`origin/main` @ `8bbc804`, PR #22, live 2026-09-11).

**Prepared, not executed.** It was written while the product owner had waived construction
checkpoints. Shipping to the family is outward-facing and was deliberately left for them to approve.

## Scope

- **FE**: bolts 069, 070, 071, 072
- **DB**: **two migrations**
  - `20260911173308_servings_per_dinner.sql`: one additive column with a check constraint
  - `20260911181346_remove_dinner.sql`: two new functions, **and a restatement of
    `fn_weekly_plan_selections_guard`** with one narrow escape (see below)
- **Edge Function**: none. `claude-proxy` is untouched; the prompt it receives got _shorter_
- **RLS**: no policy added or changed

**What ships to the family:**

- a **Servings per dinner** setting (Settings → Recipes)
- imports that **keep the page's quantities** and say what they are for, with a **Scale** button
  offered on review (never automatic)
- **Remove…** on a dinner, with a warning that states what goes

## Ordering: migrations first, and why it is safe

The frontend reads `households.servings_per_dinner` and calls the two new functions, so the
migrations must land first (ADR-9). Both are safe to apply ahead of the frontend:

- **The column** is additive with a default of 3. Nothing reads it until the frontend ships, and
  every household keeps today's behaviour.
- **The two functions** are called only by the new frontend.
- **The restated guard** is the one change that affects today's live site, because it runs on every
  plan pick. It is **behaviourally identical** for every existing caller. The escape it adds needs a
  transaction-local flag that only `fn_remove_dinner` sets, and then applies only to deletes, only in
  weeks that have ended. All **411 pre-existing pgTAP tests pass against it unchanged**, including
  the cap, the locked check and the `for update` race fix.

## ⚠ `dev` is not pushed

`git log origin/dev..dev` shows **7 commits**. Push first, then open the PR, then verify on
`origin/main` against the artifact, not the PR page (the PR #17 lesson).

## Steps

1. **Apply the migrations**: `npx supabase db push`, after `--dry-run` shows exactly these two
2. **Verify on the database**:
   - `supabase migration list` shows remote timestamps for both
   - `households.servings_per_dinner` exists, defaults to 3, and is checked 1–12
   - `fn_remove_dinner` is `definer` with `search_path=""`; `fn_dinner_removal_impact` is `invoker`
   - a probe of `fn_dinner_removal_impact` on a dinner id that does not exist returns **P0002**,
     proving the function exists and is callable without writing anything
3. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
4. **PR `dev` → `main`**, merge
5. **Verify on the artifact**: the deployed bundle contains "Servings per dinner", "Scale from",
   "Remove…" and "fn_remove_dinner"

## Staging

**Proposed: rehearse on a Supabase branch**, or accept `n/a`. This is the product owner's call.

Unlike v0.14.0, this release **changes behaviour on a function the live site calls constantly**:
the selections guard runs on every pick. It is covered by 411 unchanged tests plus 35 new ones, and
the change is one conditional that needs a flag nothing but the new function sets. The argument for
`n/a` is that strength. The argument for a rehearsal is that it is the first change to that guard
since the `for update` race fix, and a branch rehearsal on production data is cheap.

## Rollback

- **Frontend**: revert the merge commit on `main`. With the frontend rolled back, both migrations are
  invisible: an unread column and two uncalled functions. The guard's escape can never trigger,
  because nothing sets its flag.
- **Database**, if it is ever needed, with the frontend rolled back first:
  - `drop function public.fn_remove_dinner(uuid); drop function public.fn_dinner_removal_impact(uuid);`
  - restore the guard by re-running its previous definition from `20260908190000_dinners_per_week.sql`
  - `alter table public.households drop column servings_per_dinner;` This **loses each household's
    setting**, so it is only worth doing if the column itself is the problem

## Post-deploy smoke

| #   | Action                                             | Expected                                                                                                                  |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Settings → Recipes                                 | "Servings per dinner", your current value (3 if never set), and an explanation                                            |
| 2   | Change it to 4                                     | It saves; the entry form's guidance says "Enter quantities for 4"                                                         |
| 3   | **Import the pretzel bark again**                  | **Yield "8–10" verbatim; butter 1 cup, not 0.33.** This is bolt 070's outstanding live check                              |
| 4   | On that import, the range                          | A box asks what to scale from; it is empty; nothing is scaled until you choose                                            |
| 5   | Import a page that states one count                | "Scale from X to 4"; pressing it scales; Undo restores                                                                    |
| 6   | **Remove the old bark** (Remove… on its card)      | The dialog states what goes; removal works; the catalog no longer lists it. This fixes the recipe that started intent 018 |
| 7   | Remove… on a dinner in this week's **locked** plan | Refused, with the reason; "Not interested instead" offered                                                                |
| 8   | Existing screens                                   | Plan, shopping list and cooking view unchanged; picking still enforces the cap                                            |

## Decisions the product owner still needs to make

1. **Approve this plan** (Checkpoint 1), and decide on staging
2. **ADR-15's locked-plan exception**: removal is refused for a dinner in this week's locked plan
   until the week ends. This narrows the Checkpoint 2 decision "warn, don't refuse". Confirm it, or
   overturn it, which would mean making removal edit a locked plan mid-week
3. **`Daily call limit`** is 10, set during v0.14.0 testing, and smoke step 3 spends a call
