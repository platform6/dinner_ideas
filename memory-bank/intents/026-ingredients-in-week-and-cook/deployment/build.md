---
intent: 026-ingredients-in-week-and-cook
release: v0.20.0-a1a0ebb
commit: a1a0ebb
units: [001-picked-dinner-details]
created: '2026-10-19T00:36:10Z'
status: built
follows: v0.19.0-481670c
severity: routine
---

# Build Record: release v0.20.0 (intent 026 — ingredients on This week and Cook)

A picked dinner on This week expands to show its ingredients and steps. The Cook tab's expanded row
lists the ingredients above its steps. **No database change, no Edge Function change, no RLS
change.** It's a static site, as with v0.16.0 to v0.19.0.

## Artifact

- **Static site**: `dist/` from `vite build`, `dist/assets/index-DIpbxKYM.js`, 974.59 KB (the
  usual single-chunk warning, unchanged), sha256 `7b854558…a414d9cdea4ecf725`
- **PWA**: regenerated service worker, 7 precache entries, 958.19 KiB
- **No migration**: `git diff origin/main..dev -- supabase/` is empty

## Source

- Branch: `dev` @ `a1a0ebb`, 1 commit ahead of `origin/dev`
- Unreleased vs `origin/main` (`fd0a869`, v0.19.0): **3 commits** (1 construction, 2 v0.19.0 ops
  records)
- `src/`: 12 files changed, 612 insertions, 94 deletions (most of it tests)

## What ships to the family

| Unit                      | What changes                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001-picked-dinner-details | This week: an expand button on each picked dinner, any week, showing ingredients then steps. Desktop opens all three cards together; phone opens one row at a time. Cook tab: ingredients above the steps |

## Bundle check (before deploying)

Compared `dist/assets/index-DIpbxKYM.js` with the live v0.19.0 bundle (`index-CpcKcNbX.js`, fetched
2026-10-19, sha256 `49fd75e9…bc6460999f0`, matching v0.19.0's build record):

- ✅ `*, dinner_steps(*), dinner_ingredients(*)` (the Cook tab's widened select): live 0, new 1. The
  marker that tells the two releases apart after the deploy
- ✅ `Couldn’t load details for this dinner`: live 1, new 2 (the catalog card, plus This week)
- ✅ `No ingredients recorded`: live 1, new 1. One shared component now, used on three screens
- ✅ `meta-cuisine-icon` is still present (v0.19.0 unaffected)

## Tests

- **872/872 vitest**, 53 files (up from 856 at v0.19.0); `tsc -b` clean;
  `eslint src --max-warnings=0` clean
- pgTAP unchanged and not re-run, because this release has no SQL
- **Browser check**: deferred from bolt 084 into the smoke test

## Risk

**Low.** Front end only, read-only data, and reverting the merge restores v0.19.0 exactly, with no
data to undo.

- **Layout is unproven in a real browser.** jsdom has no layout, so the phone row fitting both
  buttons at 390px and three open desktop cards are only checked by the smoke test.
- **Desktop requests.** Opening the desktop cards sends up to three detail requests at once. These
  are the same requests as opening three catalog cards.

## Environments

- **dev**: verified: 872/872 vitest, `tsc -b`, eslint, `vite build`
- **staging**: n/a, skipped by the product owner at Checkpoint 1 (2026-10-19)
- **production**: not deployed
