---
intent: 019-ui-correctness-fixes
release: v0.16.0-7e955c9
commit: 7e955c9
units:
  [001-copy-corrections, 002-ingredient-aisle-default, 003-expanded-card-layout, 004-mobile-overlap-fixes]
created: '2026-09-17T19:52:11Z'
updated: '2026-09-17T19:55:07Z'
status: production-live
current_checkpoint: 4
follows: v0.15.0-b5ea091
environments:
  dev:
    status: verified
    target: 'local — vitest 777/777, tsc -b, eslint, vite build; bolts 075–076 checked in a browser at 1/2/3 columns and phone width'
  staging:
    status: 'n/a — product owner decision 2026-09-17T19:52:11Z. Static site, no schema change, and the one unproven path is a read the smoke test covers directly.'
  production:
    status: 'live 2026-09-17 — artifact verified; smoke test pending (product owner)'
    target: 'Netlify main only'
    db: 'n/a — no migration in this release (`git diff origin/main..dev -- supabase/` empty)'
    fe: 'MERGED 2026-09-17T19:53:07Z — PR #24, origin/main 887685c. Netlify served the previous bundle on the first check and index-HWT1V3UE.js on the second; the live file is byte-identical to the local build and contains "Choose aisle", "Choose an aisle.", `All ${e} dinners picked`, "Lock in this dinner", scrollPaddingBottom and "Add a dinner", with no "Add dinner".'
    edge_function: 'n/a — claude-proxy unchanged'
---

# Deployment Plan: intent 019 — UI correctness fixes (release v0.16.0)

Current production is **v0.15.0** (`origin/main` @ `4e6a156`, PR #23, live 2026-09-17).

## Scope

- **FE**: bolts 073, 074, 075, 076
- **DB**: none
- **Edge Function**: none
- **RLS**: none

## Ordering

Nothing to order: one merge to `main`, which Netlify builds. Unlike v0.15.0, no migration has to
land first — and that is exactly the mistake this release cannot repeat.

## Steps

1. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, merge
3. **Verify on the artifact, not the PR page** (the PR #17 and #22 lesson): fetch the deployed
   bundle and confirm it contains "Choose aisle", `All \ dinners picked`, "Add a dinner" and
   `scrollPaddingBottom`, and does **not** contain "Add dinner". A green PR is not a shipped
   feature, and Netlify has served a stale build before.
4. **Smoke test** (below), by the product owner

## Staging

**n/a**, by the product owner's decision. The release is a static site with no schema change;
rollback is a revert with no data to undo.

## Rollback

Revert the merge commit on `main`. Production returns to v0.15.0 exactly. Nothing was written, so
there is nothing to restore. The one user-visible consequence of reverting is that new ingredient
lines default to Produce again.

## Post-deploy smoke

| #   | Action                                                       | Expected                                                                                             |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1   | **Add a dinner → type an ingredient already in the catalog** | **Its aisle fills in by itself.** This is the one path never run against the real database           |
| 2   | Type an ingredient the household has never used              | The aisle stays "Choose aisle"; saving is refused until one is picked, with the message on that line |
| 3   | Save a dinner with every aisle set                           | Saves as before                                                                                      |
| 4   | `/plan` with 5 dinners a week and 5 picked                   | "Locks these 5 dinners…" and "All 5 dinners picked."; no "three" anywhere                            |
| 5   | Catalog on desktop → open Details on a middle card           | The card takes the whole row; later cards move below; order unchanged                                |
| 6   | Catalog on a phone → "⋮" on a long-titled dinner             | The dinner's name stays readable                                                                     |
| 7   | Shopping list on a phone → tab to an item near the footer    | The item scrolls clear of the Copy footer                                                            |
| 8   | Existing screens                                             | Plan, shopping list, cooking view and imports unchanged                                              |

## What happened (2026-09-17)

Pushed `dev`, opened PR #24, merged at 19:53:07Z. `git log origin/main..dev` is empty.

**The artifact check earned its place again.** The first fetch of the live page still referenced
v0.15.0's bundle (`index-CSSRjKNz.js`); 30 seconds later it referenced this release's
(`index-HWT1V3UE.js`). Downloaded, that file is byte-identical to the local build, and carries every
marker checked at build time. A green PR is still not a shipped feature.

Staging was skipped by the product owner's decision at Checkpoint 1.

## Decisions the product owner still needs to make

1. ~~**Approve the production deploy**~~ **Done 2026-09-17.**
2. **Run the post-deploy smoke test**, above. Step 1 is the one path never exercised against the
   real database.
