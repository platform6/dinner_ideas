---
intent: 027-tap-row-to-expand
release: v0.21.0-5d1ff15
commit: 5d1ff15
units: [001-tap-bar-to-open]
created: '2026-10-19T13:00:47Z'
updated: '2026-10-19T13:02:00Z'
status: awaiting-checkpoint-3
current_checkpoint: 3
follows: v0.20.0-a1a0ebb
environments:
  dev:
    status: verified
    target: 'local: vitest 881/881, tsc -b, eslint, vite build; browser check at 390px and desktop (remove not clicked)'
  staging:
    status: 'n/a: skipped by product owner at Checkpoint 1 (2026-10-19)'
  production:
    status: 'not deployed'
    target: 'Netlify main only'
    db: 'n/a: no migration in this release (`git diff origin/main..dev -- supabase/` empty)'
    fe: 'not merged'
    edge_function: 'n/a: claude-proxy unchanged'
---

# Deployment Plan: intent 027 — tap a picked dinner's bar to open it (release v0.21.0)

Current production is **v0.20.0** (`origin/main` @ `fb65073`, PR #28, live 2026-10-19, serving
`index-DIpbxKYM.js`, confirmed byte-identical 2026-10-19). Its smoke test hasn't been run yet, so its
checks are carried into this release's smoke test.

## Scope

- **FE**: bolt 085
- **DB**: none
- **Edge Function**: none
- **RLS**: none

## Steps

1. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, then merge
3. **Verify the deployed artifact, not the PR page**: fetch the live page until it references a
   bundle other than `index-DIpbxKYM.js`. Then confirm `border-color 0.12s ease` appears 3 times and
   that the bundle is byte-identical to the local build (sha256 `98851b2a…6cac11f495e8238a8`)
4. **Smoke test** (below), run by the product owner

## Staging

**Proposed n/a**, as for v0.16.0 to v0.20.0: a static site, no schema change, and rollback is a
revert with no data to undo. Skipped by the product owner at Checkpoint 1 (2026-10-19), with the
build approved.

## Rollback

Revert the merge commit on `main`. Production returns to v0.20.0 exactly, and there is no data to
restore.

## Post-deploy smoke (on a phone, then on a desktop)

v0.20.0's checks (1 to 7) and this release's (8 to 11):

| #   | Action                                       | Expected                                                                                       |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Phone: This week, look at each row           | Name, cuisine and time on the left; expand, then a red ✕ remove, on the right; long names wrap |
| 2   | Phone: tap a dinner's name                   | Ingredients, then Steps, under that dinner only. Tap the name again to close                   |
| 3   | Phone: tap remove on a dinner                | It's removed; nothing opens                                                                    |
| 4   | Phone: ◀ to a past week, tap a dinner        | Its ingredients and steps show. No remove button                                               |
| 5   | Phone: Cook tab, expand a dinner             | Ingredients first, then Steps (same boxed step rows as before)                                 |
| 6   | Desktop: This week, tap any card             | All cards open together; tap any card again to close them all                                  |
| 7   | Desktop: catalog, open a card's Details      | Ingredients, steps and tags look the same as before                                            |
| 8   | Phone: open a dinner, then tap an ingredient | It stays open                                                                                  |
| 9   | Phone: tap the expand icon itself            | It opens (one tap, not a flicker back closed)                                                  |
| 10  | Desktop: hover a closed card                 | Pointer cursor, and the border darkens slightly                                                |
| 11  | Either: on a past week                       | The expand icon sits at the edge (there's no remove)                                           |

## Decisions the product owner still needs to make

1. ~~**Checkpoint 1**: approve the build, and confirm skipping staging~~ (approved 2026-10-19)
2. **Checkpoint 3**: approve the production deploy (push, PR, merge)
3. **After the deploy**: run the smoke test
