---
intent: 024-mobile-ergonomics
release: v0.17.0-ba15bc0
commit: ba15bc0
units: [001-touch-target-size, 002-dense-row-layouts, 003-aisle-sheet-close]
created: '2026-09-24T13:54:53Z'
updated: '2026-09-24T13:54:53Z'
status: prepared
current_checkpoint: 1
follows: v0.16.0-7e955c9
environments:
  dev:
    status: verified
    target: 'local: vitest 798/798, tsc -b, eslint, vite build; bolts 077–079 checked in a browser at phone width and 1024px'
  staging:
    status: 'pending: product owner decision at Checkpoint 1'
  production:
    status: 'not deployed'
    target: 'Netlify main only'
    db: 'n/a: no migration in this release (`git diff origin/main..dev -- supabase/` empty)'
    fe: 'pending'
    edge_function: 'n/a: claude-proxy unchanged'
---

# Deployment Plan: intent 024 — mobile ergonomics (release v0.17.0)

Current production is **v0.16.0** (`origin/main` @ `887685c`, PR #24, live 2026-09-17, serving
`index-HWT1V3UE.js`).

## Scope

- **FE**: bolts 077, 078, 079
- **DB**: none
- **Edge Function**: none
- **RLS**: none

## Ordering

Nothing to order. It's one merge to `main`, and Netlify builds it.

## Steps

1. **Push `dev`**, then confirm `git log origin/dev..dev` is empty
2. **PR `dev` → `main`**, then merge
3. **Verify the deployed artifact, not the PR page**: fetch the live page until it references a
   bundle other than `index-HWT1V3UE.js`. Then confirm that bundle contains `["44px",null,"34px"]`,
   `["44px",null,"38px"]` and `safe-area-inset-bottom`, and that it's byte-identical to the local
   build if Netlify's build is deterministic (it was for v0.16.0)
4. **Smoke test** (below), run by the product owner on a phone

## Staging

**Pending the product owner's decision.** As with v0.16.0, this is a static site with no schema
change, and rollback is a revert with no data to undo.

## Rollback

Revert the merge commit on `main`. Production returns to v0.16.0 exactly, and there is no data to
restore.

## Post-deploy smoke (on a phone, then one desktop pass)

| #   | Action                                                     | Expected                                                                                  |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Catalog, `/plan`, shopping list, cooking view on a phone   | Buttons visibly larger; nothing wraps onto two lines, overlaps or pushes off-screen       |
| 2   | Add a dinner → cooking steps on a phone                    | Remove sits apart from the move buttons; tapping near "up" doesn't remove the step        |
| 3   | Store setup → walking-path rows on a phone                 | Each row shows its aisle name; the icon buttons don't expand the row when tapped          |
| 4   | Shopping list → tap an item to open "Where do you find it" | A Close button top-right closes it; "Take it off the path" is reachable without scrolling |
| 5   | Same screens on a laptop or desktop                        | Unchanged from v0.16.0: controls at their denser size                                     |
| 6   | Pick dinners, lock, generate list                          | Works as before                                                                           |
