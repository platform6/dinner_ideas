---
intent: 016-feeling-lucky
release: v0.13.0-6b10daf
commit: 6b10daf
units: [001-lucky-pick]
created: '2026-09-08T23:25:00Z'
updated: '2026-09-08T23:25:00Z'
status: awaiting-approval
current_checkpoint: 2
follows: v0.12.0-1223ed7
environments:
  dev:
    status: verified
    target: 'local — vitest 353/353, tsc -b, eslint, vite build; no SQL in this release'
  staging:
    status: pending
  production:
    status: pending
    target: 'Netlify main (Supabase untouched)'
    db: 'n/a — no migration. All 25 local migrations confirmed applied on prod.'
    fe: 'pending — dev @ 6b10daf needs pushing, then dev → main'
    edge_function: 'n/a'
---

# Deployment Plan: intent 016 — I'm feeling lucky (release v0.13.0)

Current production is **v0.12.0** (`origin/main` @ `520134c`, PR #20, live 2026-09-08).

## Scope

- **FE only** — `dev → main` → Netlify.
- **DB** — none. **Edge Function** — none. **RLS** — none.

## Ordering — not a question this time

v0.12.0 needed the migration applied before the merge. This release has no second half: the
control reads `households.dinners_per_week` and the `dinner_last_chosen` view, and **both already
exist on production** — the first shipped an hour ago in v0.12.0, the second has been there since
the founding schema.

The only ordering rule left is the ordinary one, and it is the one this project has already got
wrong once today.

## ⚠ `dev` is not pushed

`git log origin/dev..dev` shows **3 commits ahead**. This is the exact shape of the PR #17 failure
earlier in this session: a PR was opened, Netlify went green, and **nothing shipped**, because the
branch behind the PR had never been pushed. A green build proves the build ran, not that the
feature is in it.

**Push `dev` first.** Then open the PR. Then, after the merge, verify against `origin/main`
rather than against the PR page:

```bash
git push origin dev
# after merge:
git fetch origin && git log --oneline origin/main -1
git show origin/main:src/features/weekly-plan/lucky-draw.ts | head -5
```

If that last command prints the file, the feature is on `main`. If it errors, it is not — whatever
Netlify says.

## Steps

1. **Push `dev`** — `git push origin dev`, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, merge
3. **Netlify** builds `main` automatically; wait for green
4. **Verify on `origin/main`**, not on the PR (see above)
5. **Smoke on the live site** (below)
6. Record the result, close Checkpoint 4

## Rollback

Revert the merge commit on `main` and let Netlify rebuild. There is no database state to unwind,
no migration to reverse, and no data written by this feature that a user cannot undo with a tap —
a lucky pick produces ordinary `weekly_plan_selections` rows, identical to hand-picked ones.

**This is the cheapest rollback of any release in this project.** Worth stating plainly, because
it is the main argument for shipping it without a staging rehearsal.

## Staging

**Recommend skipping**, and the reasoning is stronger than for v0.12.0:

- No schema change, so no migration to rehearse
- No new query, so no RLS surface to test
- The writes go through `createPlan` / `addSelection` — the same path every hand-pick has used
  since v0.1, and the same path intent 015's triggers already guard
- The only genuinely new logic is a **pure function** with 11 cases including a 2000-draw
  distribution check, and it cannot touch the database at all

What staging would catch that local tests did not: nothing specific. The residual risk is in the
wiring — whether the button is enabled at the right times against real data — and that is what the
post-deploy smoke is for.

## Post-deploy smoke — https://dinnerideas.netlify.app

The one thing the automated suite cannot check is whether the draw produces _sensible_ dinners
against 50 real rows with real history.

| #   | Step                                     | Expected                                                                              |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Open the catalog with an empty week      | **"Surprise me"** beside Clear Picks, enabled                                         |
| 2   | Press it                                 | The week fills to the household's number (3). Badge reads "3 of 3"                    |
| 3   | Look at what it drew                     | Dinners you have not had recently. **Not** the three oldest — that would be a ranking |
| 4   | Clear picks, press again                 | A **different** set, mostly. Identical sets twice running is the failure to look for  |
| 5   | Pick one by hand, then press Surprise me | Fills the remaining 2 only; your pick survives                                        |
| 6   | With a full week                         | Disabled, and says **"Your week is already full."**                                   |
| 7   | Lock the week, then look                 | Disabled, and says **"This week is locked in."** Locked wins over full                |

Step 3 and step 4 are the two that matter. Everything else is covered by tests; those two are the
promises a test can only approximate.

## Checkpoints

- **Checkpoint 2 — staging**: recommend `n/a`, awaiting the product owner's call
- **Checkpoint 3 — production**: awaiting approval
- **Checkpoint 4 — post-deploy**: open until the smoke above is performed
