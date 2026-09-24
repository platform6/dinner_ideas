---
intent: 024-mobile-ergonomics
release: v0.17.0-ba15bc0
commit: ba15bc0
units: [001-touch-target-size, 002-dense-row-layouts, 003-aisle-sheet-close]
created: '2026-09-24T13:54:53Z'
status: built
follows: v0.16.0-7e955c9
severity: routine
---

# Build Record: release v0.17.0 (intent 024 — mobile ergonomics)

Controls that are easier to hit on a phone, and two dense rows reworked so they stop crowding what
matters. **No database change, no Edge Function change, no RLS change.** Like v0.16.0, it's a static
site and nothing else.

## Artifact

- **Static site**: `dist/` from `vite build`, `dist/assets/index-CnkZZmdO.js`, 972 KB (the usual
  single-chunk warning, unchanged), sha256 `551d441c…d4fa09`
- **PWA**: regenerated service worker, 7 precache entries, 955.62 KiB
- **No migration**: `git diff origin/main..dev -- supabase/` is empty

## Source

- Branch: `dev` @ `ba15bc0`, working tree clean, 2 commits ahead of `origin/dev`
- Unreleased vs `origin/main`: **6 commits** (3 construction, 1 inception, 2 v0.16.0 ops records)
- `src/`: 10 files changed, 548 insertions, 91 deletions (about half of that is tests)

## What ships to the family

| Unit                  | What changes                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 001-touch-target-size | On a phone, the theme's `sm` controls, selects and tag chips are 44px; from `md` up they keep their denser 34/38px                            |
| 002-dense-row-layouts | The cooking-step row separates Remove from the harmless buttons; the Store setup walking-path row stops squeezing out the aisle name          |
| 003-aisle-sheet-close | The "Where do you find it" sheet has a visible 44px Close; "Take it off the path" is pinned where it can be reached, clear of the screen edge |

## Bundle check (before deploying)

Grepped `dist/assets/index-CnkZZmdO.js`:

- ✅ `["44px",null,"34px"]` ×3: the `sm` size's height and min-width at phone width
- ✅ `["44px",null,"38px"]` ×1: the select height
- ✅ `safe-area-inset-bottom`: the aisle sheet's bottom allowance
- ✅ "Where do you find it" and "Take it off the path" are still present

Baseline: the live v0.16.0 bundle (`index-HWT1V3UE.js`) has **0** occurrences of
`["44px",null,"34px"]`, so after the deploy that marker tells the two releases apart.

## Tests

- **798/798 vitest**, 50 files (up from 777 at v0.16.0); `tsc -b` clean;
  `eslint src --max-warnings=0` clean
- pgTAP unchanged and not re-run, because this release has no SQL
- `touch-targets.test.ts` pins the theme values, and each bolt was checked in a browser at phone
  width and at 1024px (NFR-3)

## Risk

**Low.** Everything is client-side, and reverting the merge restores v0.16.0 exactly, with no data
to undo.

- **Widest reach of any recent release**: 78 controls inherit the `sm` size, so on a phone every
  screen changes a little. Reflow (a wrapped header, a stretched card) is the likeliest problem. The
  screens named in FR-1 were checked, but not every screen in the app.
- **From `md` up nothing should move** (NFR-2). A desktop regression would mean the responsive array
  isn't resolving.
- Store setup: the row itself expands on tap, and its buttons must not trigger that. Tests cover it
  (`StoreConfigPage.test.tsx`).

## Environments

- **dev**: verified: 798/798 vitest, `tsc -b`, eslint, `vite build`; bolts 077–079 checked in a
  browser at phone width and 1024px
- **staging**: pending the product owner's decision at Checkpoint 1
- **production**: not deployed
