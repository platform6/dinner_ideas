---
intent: 019-ui-correctness-fixes
release: v0.16.0-7e955c9
commit: 7e955c9
units:
  [001-copy-corrections, 002-ingredient-aisle-default, 003-expanded-card-layout, 004-mobile-overlap-fixes]
created: '2026-09-17T19:50:38Z'
status: deployed
follows: v0.15.0-b5ea091
severity: routine
---

# Build Record: release v0.16.0 (intent 019 — UI correctness fixes)

Four small fixes to things that were wrong on screen. **No database change, no Edge Function
change, no RLS change** — the first release since v0.11.x with nothing but a static site in it.

## Artifact

- **Static site**: `dist/` from `vite build`, `dist/assets/index-HWT1V3UE.js`, 948 KB (the usual
  single-chunk warning, unchanged from previous releases).
- **PWA**: regenerated service worker, 7 precache entries, 954.60 KiB.
- **No migration**: `git diff origin/main..dev -- supabase/` is empty.

## Source

- Branch: `dev` @ `7e955c9`, working tree clean
- Unreleased vs `origin/main`: **7 commits** (4 construction, 1 inception, 1 inbox, 1 v0.15.0 ops
  record)
- `src/`: 27 files changed, 1102 insertions, 60 deletions

## What ships to the family

| Unit                         | What changes                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001-copy-corrections         | `/plan` states the household's dinner count, with singular wording at 1; the catalog button reads "Add a dinner"                                         |
| 002-ingredient-aisle-default | A new ingredient line has no aisle until known or chosen; a name the household has saved before fills its aisle from the most recent dinner that used it |
| 003-expanded-card-layout     | An open catalog card spans its row at 2 and 3 columns                                                                                                    |
| 004-mobile-overlap-fixes     | The phone shopping-list footer no longer hides a focused item; the card's action menu no longer covers the dinner's name                                 |

## Bundle check (before deploying)

Grepped `dist/assets/index-HWT1V3UE.js`:

- ✅ `All ${e} dinners picked` and `Locks these ${e} dinner` — the counts are interpolated, not
  literal
- ✅ "Choose aisle" (the placeholder) and "Choose an aisle." (the save error)
- ✅ "Add a dinner" present, **"Add dinner" absent**
- ✅ `scrollPaddingBottom` present (the phone footer's focus fix)

## Tests

- **777/777 vitest**, 48 files; `tsc -b` clean; `eslint src --max-warnings=0` clean
- pgTAP unchanged and not re-run: no SQL in this release
- Per-bolt regression proof: in each of 073–076, the new tests were shown to fail against the old
  behaviour before being accepted
- Bolts 075 and 076 were additionally verified in a browser against the household's own catalog

## Risk

**Low, with one unproven path.** Everything here is client-side, and reverting the merge restores
v0.15.0 exactly, with no data to undo.

- **Unproven against production**: bolt 074's aisle-history read
  (`dinner_ingredients` joined to `dinners`) has only ever run against mocks. It type-checks
  against the generated schema types, which allow that embed only along a real foreign key, but no
  request has been made to Supabase. **This is the one thing the smoke test must cover.**
- **Behaviour change worth naming**: saving a dinner now refuses a line with no aisle. That is the
  intent, but it is the only place this release can stop the family doing something they could do
  yesterday.
- Not covered by tests: `DinnerCard` passing its offset to the menu (jsdom has no layout). Proven in
  the browser at Stage 2 of bolt 076.

## Environments

- **dev**: verified — 777/777 vitest, `tsc -b`, eslint, `vite build`; bolts 075–076 checked in a
  browser at 1, 2 and 3 columns and at phone width
- **staging**: n/a — product owner decision at Checkpoint 1
- **production**: live 2026-09-17, PR #24, `origin/main` 887685c; artifact verified byte-identical
