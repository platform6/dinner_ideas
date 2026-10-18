---
intent: 023-shopping-list-consolidation
release: v0.18.0-6179850
commit: 6179850
units: [001-line-merging, 002-merged-line-aisle, 003-empty-aisle-toggle]
created: '2026-10-18T20:05:42Z'
updated: '2026-10-18T20:13:01Z'
status: production-live
current_checkpoint: 3
follows: v0.17.0-ba15bc0
environments:
  dev:
    status: verified
    target: 'local: vitest 848/848, tsc -b, eslint, vite build; bolts 080–082 checked in a browser against the household data, read-only'
  staging:
    status: 'n/a: product owner decision 2026-10-18T20:09:01Z. Static site, no schema change, rollback is a revert.'
  production:
    status: 'live 2026-10-18: artifact verified; smoke test pending'
    target: 'Netlify main only'
    db: 'n/a: no migration in this release (`git diff origin/main..dev -- supabase/` empty)'
    fe: 'MERGED 2026-10-18T20:11:25Z: PR #26, origin/main 5cf28c4. Netlify served index-CnkZZmdO.js for five checks, then index-CSU5_rAt.js at 20:12:50Z; the live file is byte-identical to the local build (sha256 d3c84431…a5e00005c) and contains "Hide empty aisles".'
    edge_function: 'n/a: claude-proxy unchanged'
---

# Deployment Plan: intent 023 — shopping list consolidation (release v0.18.0)

Current production is **v0.17.0** (`origin/main` @ `adfc711`, PR #25, live 2026-09-24, serving
`index-CnkZZmdO.js`, confirmed 2026-10-18).

## Scope

- **FE**: bolts 080, 081, 082
- **DB**: none
- **Edge Function**: none
- **RLS**: none

## Ordering

Nothing to order. It's one merge to `main`, and Netlify builds it. 080 and 081 are in the same merge,
which is what they need.

## Steps

1. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, then merge
3. **Verify the deployed artifact, not the PR page**: fetch the live page until it references a
   bundle other than `index-CnkZZmdO.js`. Then confirm that bundle contains `Hide empty aisles`, and
   that it's byte-identical to the local build (Netlify's build was deterministic for v0.16.0 and
   v0.17.0)
4. **Smoke test** (below), run by the product owner

## Staging

**n/a**, by the product owner's decision at Checkpoint 1. As for v0.16.0 and v0.17.0: a static site, no schema change, and rollback is a
revert with no data to undo.

## Rollback

Revert the merge commit on `main`. Production returns to v0.17.0 exactly, and there is no data to
restore.

## Post-deploy smoke (on a phone)

| #   | Action                                                           | Expected                                                                                            |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Pick dinners, lock, open the shopping list                       | Fewer lines: no separate "onion, diced" and "onion"; amounts read side by side ("2 lb + 4")         |
| 2   | Find a merged line (e.g. chicken, onion, celery)                 | It sits in its usual aisle, not in a catch-all at the end                                           |
| 3   | Check that line, then tap its Move button and pick another aisle | The sheet opens for a real item; the line re-sorts and stays checked                                |
| 4   | Scan for two different groceries merged onto one line            | None ("diced tomatoes" stays separate from tomatoes)                                                |
| 5   | Store setup → walking path                                       | "Show 4 empty aisles" at the end; tapping it reveals Aisle 1, Bakery, Garmantasdf, Aisle 2 in place |
| 6   | Copy the shopping list                                           | The pasted text matches the screen's lines and amounts                                              |

## What happened (2026-10-18)

Committed the plan, pushed `dev` (`git log origin/dev..dev` empty) and opened PR #26. Waited for
Netlify's deploy preview to pass, then merged at 20:11:25Z (`5cf28c4`).

The live page referenced v0.17.0's bundle (`index-CnkZZmdO.js`) for about 80 seconds, then this
release's (`index-CSU5_rAt.js`). The downloaded file is byte-identical to the local build and
contains `Hide empty aisles`. Before the merge, the v0.17.0 bundle had no `empty aisle` at all.

## Decisions the product owner still needs to make

1. ~~**Checkpoint 1**: approve the build, and confirm skipping staging~~ **Done 2026-10-18T20:09:01Z.**
2. ~~**Checkpoint 3**: approve the production deploy (push, PR, merge)~~ **Done 2026-10-18.**
3. **After the deploy**: run the smoke test
