---
intent: 027-tap-row-to-expand
release: v0.21.0-5d1ff15
commit: 5d1ff15
units: [001-tap-bar-to-open]
created: '2026-10-19T13:00:47Z'
status: built
follows: v0.20.0-a1a0ebb
severity: routine
---

# Build Record: release v0.21.0 (intent 027 — tap a picked dinner's bar to open it)

On This week, tapping anywhere on a picked dinner's bar opens or closes it. The expand icon now
comes before remove, and remove's icon is red (`heart.500`). **No database change, no Edge
Function change, no RLS change.** It's a static site, as with v0.16.0 to v0.20.0.

## Artifact

- **Static site**: `dist/` from `vite build`, `dist/assets/index-Cxafp-DF.js`, 974.51 KB (the
  usual single-chunk warning, unchanged), sha256 `98851b2a…6cac11f495e8238a8`
- **PWA**: regenerated service worker, 7 precache entries, 958.43 KiB
- **No migration**: `git diff origin/main..dev -- supabase/` is empty

## Source

- Branch: `dev` @ `5d1ff15`
- Unreleased vs `origin/main` (`fb65073`, v0.20.0): **3 commits** (1 v0.20.0 ops record, 1
  inception, 1 construction)
- `src/`: 2 files changed (`PlanPage.tsx` and its tests), 148 insertions, 21 deletions

## What ships to the family

| Unit                | What changes                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001-tap-bar-to-open | This week: tap a dinner's bar to open or close it (one row on phone, all cards on desktop). Taps inside the open details don't close it. Expand before a red remove |

## Bundle check (before deploying)

Compared `dist/assets/index-Cxafp-DF.js` with the live v0.20.0 bundle (`index-DIpbxKYM.js`, fetched
2026-10-19, sha256 `7b854558…a414d9cdea4ecf725`, matching v0.20.0's build record):

- ✅ `border-color 0.12s ease` (the card hover transition): live 2, new 3. The marker that tells the
  two releases apart after the deploy
- ✅ `heart.500`: live 12, new 13 (the remove icon)
- ✅ `line.brand`: live 12, new 13 (the card hover border)
- ✅ The Cook tab's ingredients select, "Couldn’t load details" and `meta-cuisine-icon` are
  unchanged (v0.20.0 and v0.19.0 unaffected)

## Tests

- **881/881 vitest**, 53 files (up from 872 at v0.20.0); `tsc -b` clean;
  `eslint src --max-warnings=0` clean
- pgTAP unchanged and not re-run, because this release has no SQL
- **Browser check** (bolt 085, local dev server at 390px and desktop width): passed, except remove,
  which wasn't clicked against the household's real plan. Remove is in the smoke test

## Risk

**Low.** Front end only, one component, and reverting the merge restores v0.20.0 exactly, with no
data to undo.

- **Touch**: the bar's tap target was checked with a mouse only. The smoke test covers a real phone
- **v0.20.0 not yet smoke-tested**: its 7 checks are carried into this release's smoke test

## Environments

- **dev**: verified: 881/881 vitest, `tsc -b`, eslint, `vite build`, browser check
- **staging**: n/a, skipped by the product owner at Checkpoint 1 (2026-10-19)
- **production**: not deployed
