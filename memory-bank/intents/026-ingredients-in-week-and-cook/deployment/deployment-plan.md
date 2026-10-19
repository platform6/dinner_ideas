---
intent: 026-ingredients-in-week-and-cook
release: v0.20.0-a1a0ebb
commit: a1a0ebb
units: [001-picked-dinner-details]
created: '2026-10-19T00:36:10Z'
updated: '2026-10-19T10:07:28Z'
status: shipped-awaiting-smoke
current_checkpoint: 3
follows: v0.19.0-481670c
environments:
  dev:
    status: verified
    target: 'local: vitest 872/872, tsc -b, eslint, vite build; no browser check (deferred to smoke)'
  staging:
    status: 'n/a: skipped by product owner at Checkpoint 1 (2026-10-19)'
  production:
    status: 'deployed; artifact verified; smoke test pending'
    target: 'Netlify main only'
    db: 'n/a: no migration in this release (`git diff origin/main..dev -- supabase/` empty)'
    fe: 'PR #28 merged as fb65073; live index-DIpbxKYM.js byte-identical to the local build (2026-10-19T10:07:28Z)'
    edge_function: 'n/a: claude-proxy unchanged'
---

# Deployment Plan: intent 026 — ingredients on This week and Cook (release v0.20.0)

Current production is **v0.19.0** (`origin/main` @ `fd0a869`, PR #27, live 2026-10-18, serving
`index-CpcKcNbX.js`, confirmed 2026-10-19).

## Scope

- **FE**: bolt 084
- **DB**: none (read-only use of `dinner_ingredients`, already readable under RLS)
- **Edge Function**: none
- **RLS**: none

## Steps

1. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, then merge
3. **Verify the deployed artifact, not the PR page**: fetch the live page until it references a
   bundle other than `index-CpcKcNbX.js`. Then confirm that bundle contains
   `*, dinner_steps(*), dinner_ingredients(*)` and that it's byte-identical to the local build
   (sha256 `7b854558…a414d9cdea4ecf725`)
4. **Smoke test** (below), run by the product owner

## Staging

**n/a**, as for v0.16.0 to v0.19.0: a static site, no schema change, and rollback is a revert
with no data to undo. Skipped by the product owner at Checkpoint 1 (2026-10-19), with the build
approved.

## Deployed

- **Checkpoint 3** approved by the product owner on 2026-10-19
- `dev` pushed; PR #28 (`dev` → `main`, 4 commits) merged as `fb65073`
- Live site switched from `index-CpcKcNbX.js` to `index-DIpbxKYM.js` within about a minute
- Live bundle sha256 `7b854558…a414d9cdea4ecf725`, **byte-identical** to the local build
- Marker `"*, dinner_steps(*), dinner_ingredients(*)"` present once; `meta-cuisine-icon` still
  present
- Smoke test: pending (product owner)

## Rollback

Revert the merge commit on `main`. Production returns to v0.19.0 exactly, and there is no data to
restore.

## Post-deploy smoke (on a phone, then on a desktop)

This also covers the browser check deferred from bolt 084.

| #   | Action                                     | Expected                                                                                               |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1   | Phone: This week, look at each row         | Name, cuisine and time on the left; remove and expand buttons on the right; a long name wraps, not cut |
| 2   | Phone: This week, tap expand on one dinner | Ingredients, then Steps, under that dinner only. Others stay closed. Tap again to close                |
| 3   | Phone: tap remove on another dinner        | It's removed; nothing expands                                                                          |
| 4   | Phone: ◀ to a past week, expand a dinner   | Its ingredients and steps show. No remove button                                                       |
| 5   | Phone: Cook tab, expand a dinner           | Ingredients first, then Steps (same boxed step rows as before)                                         |
| 6   | Desktop: This week, tap expand on any card | All three cards open together and stay level; tap collapse on any card to close all three              |
| 7   | Desktop: catalog, open a card's Details    | Ingredients, steps and tags look the same as before                                                    |

## Decisions the product owner still needs to make

1. ~~**Checkpoint 1**: approve the build, and confirm skipping staging~~ (approved 2026-10-19)
2. ~~**Checkpoint 3**: approve the production deploy (push, PR, merge)~~ (approved and shipped
   2026-10-19)
3. **After the deploy**: run the smoke test
