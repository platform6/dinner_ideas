---
intent: 025-hide-photo-slots
release: v0.19.0-481670c
commit: 481670c
units: [001-photo-slots-off]
created: '2026-10-18T20:26:52Z'
status: built
follows: v0.18.0-6179850
severity: routine
---

# Build Record: release v0.19.0 (intent 025 — hide photo slots)

The three photo slots are off until dinners have photos, and the cooking view keeps its cuisine
icon in the meta row. **No database change, no Edge Function change, no RLS change.** It's a static
site, as with v0.16.0 to v0.18.0.

## Artifact

- **Static site**: `dist/` from `vite build`, `dist/assets/index-CpcKcNbX.js`, 972.62 KB (the
  usual single-chunk warning, unchanged), sha256 `49fd75e9…bc6460999f0`
- **PWA**: regenerated service worker, 7 precache entries, 956.58 KiB
- **No migration**: `git diff origin/main..dev -- supabase/` is empty

## Source

- Branch: `dev` @ `481670c`, 1 commit ahead of `origin/dev`
- Unreleased vs `origin/main` (`5cf28c4`, v0.18.0): **3 commits** (1 construction, 2 v0.18.0 ops
  records)
- `src/`: 7 files changed, 214 insertions, 17 deletions (most of it tests)

## What ships to the family

| Unit                | What changes                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001-photo-slots-off | No empty picture tiles on the catalog card, the cooking view rows or the This week cards (desktop). The cooking view shows a small cuisine icon before the cook time instead |

## Bundle check (before deploying)

Compared `dist/assets/index-CpcKcNbX.js` with the live v0.18.0 bundle (`index-CSU5_rAt.js`, fetched
2026-10-18):

- ✅ `meta-cuisine-icon`: live 0, new 1. The cooking view's fallback icon, and the marker that tells
  the two releases apart after the deploy
- ✅ `w:"76px",h:"76px"` (the catalog tile): live 1, new 0. With the constant `false`, the
  minifier drops the slot markup from the bundle. It's still in the source
- ✅ `Hide empty aisles` is still present (v0.18.0 unaffected)

## Tests

- **856/856 vitest**, 51 files (up from 848 at v0.18.0); `tsc -b` clean;
  `eslint src --max-warnings=0` clean
- pgTAP unchanged and not re-run, because this release has no SQL
- **No browser check yet.** It was deferred by the product owner because Chrome wasn't connected,
  so it's part of the smoke test

## Risk

**Low.** Three components lose a decorative tile, and reverting the merge restores v0.18.0 exactly,
with no data to undo.

- **Layout is unproven in a real browser.** jsdom has no layout, so the title and meta sitting
  correctly once a slot is gone is only checked by the smoke test.

## Environments

- **dev**: verified: 856/856 vitest, `tsc -b`, eslint, `vite build`
- **staging**: n/a: product owner decision at Checkpoint 1
- **production**: not deployed
