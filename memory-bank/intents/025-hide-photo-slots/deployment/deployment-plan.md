---
intent: 025-hide-photo-slots
release: v0.19.0-481670c
commit: 481670c
units: [001-photo-slots-off]
created: '2026-10-18T20:26:52Z'
updated: '2026-10-18T20:27:36Z'
status: awaiting-checkpoint-3
current_checkpoint: 3
follows: v0.18.0-6179850
environments:
  dev:
    status: verified
    target: 'local: vitest 856/856, tsc -b, eslint, vite build; no browser check (deferred to smoke)'
  staging:
    status: 'n/a: product owner decision 2026-10-18T20:27:36Z. Static site, no schema change, rollback is a revert.'
  production:
    status: 'not deployed'
    target: 'Netlify main only'
    db: 'n/a: no migration in this release (`git diff origin/main..dev -- supabase/` empty)'
    fe: 'pending'
    edge_function: 'n/a: claude-proxy unchanged'
---

# Deployment Plan: intent 025 — hide photo slots (release v0.19.0)

Current production is **v0.18.0** (`origin/main` @ `5cf28c4`, PR #26, live 2026-10-18, serving
`index-CSU5_rAt.js`, confirmed 2026-10-18).

## Scope

- **FE**: bolt 083
- **DB**: none
- **Edge Function**: none
- **RLS**: none

## Steps

1. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, then merge
3. **Verify the deployed artifact, not the PR page**: fetch the live page until it references a
   bundle other than `index-CSU5_rAt.js`. Then confirm that bundle contains `meta-cuisine-icon`
   and that it's byte-identical to the local build (sha256 `49fd75e9…bc6460999f0`)
4. **Smoke test** (below), run by the product owner

## Staging

**n/a**, by the product owner's decision at Checkpoint 1. As for v0.16.0 to v0.18.0: a static site, no schema change, and rollback is a
revert with no data to undo

## Rollback

Revert the merge commit on `main`. Production returns to v0.18.0 exactly, and there is no data to
restore.

## Post-deploy smoke (on a phone, then on a desktop)

This also covers the browser check deferred from bolt 083.

| #   | Action                                 | Expected                                                                                          |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Phone: open the catalog                | No grey tile on any card. The title sits at the card's left edge, and cuisine and time show below |
| 2   | Phone: Cook tab (with the week full)   | No thumb on any row. Each meta line starts with the cuisine icon, then the cook time and steps    |
| 3   | Phone: expand a dinner in the Cook tab | The steps open as before                                                                          |
| 4   | Desktop: This week                     | Three-across cards go from the badge row straight to name and meta, with no empty grey block      |
| 5   | Desktop: catalog                       | Same as #1, with the grid columns unchanged                                                       |

## Decisions the product owner still needs to make

1. ~~**Checkpoint 1**: approve the build, and confirm skipping staging~~ **Done 2026-10-18T20:27:36Z.**
2. **Checkpoint 3**: approve the production deploy (push, PR, merge)
3. **After the deploy**: run the smoke test
