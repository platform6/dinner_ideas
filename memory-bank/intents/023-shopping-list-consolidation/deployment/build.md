---
intent: 023-shopping-list-consolidation
release: v0.18.0-6179850
commit: 6179850
units: [001-line-merging, 002-merged-line-aisle, 003-empty-aisle-toggle]
created: '2026-10-18T20:05:42Z'
status: verified
follows: v0.17.0-ba15bc0
severity: routine
---

# Build Record: release v0.18.0 (intent 023 — shopping list consolidation)

A shopping list you can shop from without merging lines in your head, and a walking path that shows
the aisles the household uses. **No database change, no Edge Function change, no RLS change.** It's
a static site, as with v0.16.0 and v0.17.0.

## Artifact

- **Static site**: `dist/` from `vite build`, `dist/assets/index-CSU5_rAt.js`, 973 KB (the usual
  single-chunk warning, unchanged), sha256 `d3c84431…a5e00005c`
- **PWA**: regenerated service worker, 7 precache entries, 956.83 KiB
- **No migration**: `git diff origin/main..dev -- supabase/` is empty

## Source

- Branch: `dev` @ `6179850`, 2 commits ahead of `origin/dev`
- Unreleased vs `origin/main` (`adfc711`, v0.17.0): **6 commits** (3 construction, 1 inception,
  2 v0.17.0 ops records)
- `src/`: 13 files changed, 966 insertions, 69 deletions (most of it tests)

## What ships to the family

| Unit                   | What changes                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 001-line-merging       | "onion, diced", "onion, sliced" and "onion" are one line. Each unit's amount sits side by side ("2 lb + 4"), and cup/cups are one unit. 151 lines → 128 across 52 dinners                        |
| 002-merged-line-aisle  | A merged line finds its registry item (exact name, else a placed variant, else the first variant), so it keeps its aisle, its Move button and its check mark. 10 household lines regain an aisle |
| 003-empty-aisle-toggle | Store setup tucks aisles with nothing at them behind "Show N empty aisles" (4 of the household's 9 stops today)                                                                                  |

**080 and 081 must ship together.** Without 081, eight comma-spelled groceries ("celery ribs,
chopped") would lose their aisle under 080's plain label.

## Bundle check (before deploying)

Grepped `dist/assets/index-CSU5_rAt.js`:

- ✅ `Hide empty aisles` ×1: bolt 082's toggle
- ✅ `Where do you find it` and `moved to position` are still present

Baseline: the live v0.17.0 bundle (`index-CnkZZmdO.js`, fetched 2026-10-18) has **0** occurrences of
`empty aisle`. After the deploy, that marker tells the two releases apart.

## Tests

- **848/848 vitest**, 51 files (up from 798 at v0.17.0); `tsc -b` clean;
  `eslint src --max-warnings=0` clean
- pgTAP unchanged and not re-run, because this release has no SQL
- Mutation checks: bolt 080 caught 8 mutants, 081 caught 5 and 082 caught 10
- Browser checks against the household's own data, read-only: 080's merge (151 → 128 lines), 081
  (every catalog line resolves to an item), 082 (phone width, 388px)

## Risk

**Low to moderate.** Everything is client-side, and reverting the merge restores v0.17.0 exactly,
with no data to undo.

- **The shopping list changes shape for everyone.** Merging is the point, but a wrong merge (two
  different groceries on one line) would be a quiet error. NFR-2 (precision over recall) limits
  merging to the comma note; "diced tomatoes" stays apart from tomatoes.
- **Check marks carry nothing over.** They're page state only (`useState`), so a release can't
  strand a check made under an old label.
- **No reorder was tried on real data in 081 or 082.** Moves are covered by page tests only.

## Environments

- **dev**: verified: 848/848 vitest, `tsc -b`, eslint, `vite build`; each bolt checked in a
  browser against the household's data, read-only
- **staging**: n/a: product owner decision at Checkpoint 1
- **production**: live 2026-10-18, PR #26, `origin/main` 5cf28c4; artifact verified byte-identical; smoke test passed
