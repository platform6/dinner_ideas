---
intent: 016-feeling-lucky
release: v0.13.0-6b10daf
commit: 6b10daf
units: [001-lucky-pick]
created: '2026-09-08T23:20:00Z'
status: built
follows: v0.12.0-1223ed7
---

# Build Record: release v0.13.0 (intent 016 — I'm feeling lucky)

A "Surprise me" control on the catalog that fills the week's remaining picks at random, weighted
away from dinners eaten recently.

## Artifact

- **Static site only**: `dist/` from `vite build` — Netlify builds it from `main`.
- **No migration. No Edge Function. No RLS. No new table, column, view or query.**

That last line is the defining fact of this release, and it is verified from both ends rather than
asserted: `git diff --name-only origin/main..dev` touches nothing under `supabase/`, and
`supabase migration list --linked` shows **every local migration already applied remotely**,
`20260908190000` included. There is nothing to apply and nothing to order.

## Source

- Branch: `dev` @ `6b10daf`, working tree clean
- Unreleased vs `origin/main` (`520134c`, PR #20): **3 commits**

| Commit    | Contents                       | Surface |
| --------- | ------------------------------ | ------- |
| `5fb0ab4` | v0.12.0 ops record             | docs    |
| `fe1988e` | intent 015 end-to-end verified | docs    |
| `6b10daf` | **bolt 066 — the lucky pick**  | **FE**  |

## Code payload

```text
6 source/test files + 13 memory-bank files
1043 insertions(+), 41 deletions(-)
```

| File                                          | What                                             |
| --------------------------------------------- | ------------------------------------------------ |
| `weekly-plan/lucky-draw.ts`                   | `luckyWeight` + `drawLucky` — pure, seedable     |
| `weekly-plan/hooks.ts`                        | `useLuckyPick` — resolves the plan once          |
| `weekly-plan/components/LuckyPickControl.tsx` | the button and its three disabled states         |
| `dinners/components/CatalogPage.tsx`          | candidates, slot count, handler, result messages |
| + three test files                            | 22 new cases                                     |

## Verification — 2026-09-08

| Check                | Command                            | Result                                   |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| Unit + component     | `npx vitest run`                   | ✅ **353 / 353** (34 files)              |
| Type check           | `npx tsc -b`                       | ✅ clean                                 |
| Lint                 | `npx eslint src`                   | ✅ clean                                 |
| Production build     | `npx vite build`                   | ✅ green — 7 precache entries, 911 KiB   |
| Prod migration state | `supabase migration list --linked` | ✅ **all 25 applied; nothing pending**   |
| SQL surface          | `git diff --name-only`             | ✅ **no file under `supabase/` touched** |

pgTAP was not re-run: this release contains no SQL. It stood at 370/370 on a clean-slate reset at
v0.12.0, and nothing since has touched the database.

## The v0.12.0 types flag is now closed

v0.12.0's build record carried a warning: `database.types.ts` had been regenerated from `--local`
in bolt 064 — the only time in this project's history it ran ahead of production — and a routine
`--linked` regen during that deploy window would have silently reverted it and broken the build.

**That window is shut.** The migration shipped, so the two sides have converged. Regenerated from
`--linked` and compared: **490 column declarations on each side, zero differences.** The remaining
textual diff is prettier formatting (quote style and line wrapping) and Supabase's
`__InternalSupabase` block, which this project has always dropped.

No regen is needed for this release, and one would now be harmless. Recorded because the warning
was recorded.

## Dependencies

**None added or changed.**

## What ships

- A **"Surprise me"** button in the catalog header, beside Clear Picks
- One press fills every empty slot for the week, keeping existing picks
- The draw is **weighted by recency**: a dinner eaten long ago, or never, is likelier than one
  eaten this week — but a dinner eaten today is still possible, not excluded
- Suppressed and already-picked dinners are never drawn
- Disabled with the reason shown when the week is locked, already full, or has no candidates
- "Only N left to choose from" warns **before** the press when candidates are short

## Known and accepted

- **The partial-failure path has no automated test.** If insert 3 of 4 fails, the first two stand
  and the catalog renders "Added N of M". Provoking that against mocks would assert mock
  choreography rather than behaviour, so the path is reasoned, not proven. It is also the least
  likely path to be exercised: intent 015's cap trigger serialises on the plan row, and the
  control computes slots from the same number the trigger enforces.
- **No end-to-end check yet.** Pressing the button on the live site and seeing sensible dinners
  appear is a post-deploy step, as it was for intent 015.
- **The bias is measured, not asserted** — 2000 seeded draws, >90% for a 400-day-old dinner over a
  one-day-old one. A statistical bound, so a pathological seed could in principle flake; the
  margin was chosen wide (weights ~401 vs ~2) to make that vanishingly unlikely.

## Next

→ **Checkpoint 2 / 3 — staging decision and production deploy.** Frontend-only, so ordering is not
a question for the first time since v0.11.1.
