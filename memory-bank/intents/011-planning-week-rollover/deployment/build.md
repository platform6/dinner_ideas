---
intent: 011-planning-week-rollover
release: v0.9.0-58579d7
commit: 58579d7
created: '2026-09-04T02:56:24Z'
status: verified
---

# Build Record: release v0.9.0 (intents 012 + 011 + 009)

## Artifact

No container image. The release is:

- **SQL**: `supabase/migrations/20260904020000_households_week_start_day.sql` (committed, 18 lines).
- **Static site**: `dist/` from `pnpm run build` — Netlify builds this itself from `main`
  (`command = "pnpm run build"`, `publish = "dist"`, `NODE_VERSION = 22`).
- No Edge Function change.

## Source

- Branch: `dev` @ `58579d7`
- Unreleased vs `origin/main`: 5 commits (`6a9c575`, `d7d4eae`, `6846afb`, `3b9ee93`, `58579d7`)
- Not yet on `origin/dev` (local `dev` is 5 ahead) — push before the `main` PR.

## Verification (dev / local)

| Check                  | Command                                    | Result                                    | When       |
| ---------------------- | ------------------------------------------ | ----------------------------------------- | ---------- |
| Unit + component tests | `npx vitest run`                           | ✅ 222 / 222 (29 files)                   | 2026-09-04 |
| Type check             | `npx tsc -b`                               | ✅ clean                                  | 2026-09-04 |
| Lint                   | `npx eslint src`                           | ✅ clean                                  | 2026-09-04 |
| Production build       | `pnpm run build` (Netlify's exact command) | ✅ `built in ~4s`; PWA precache 7 entries | 2026-09-04 |

Chunk-size >500 kB warning is pre-existing (present since before this release) — not a
blocker.

## New / changed files in this release

- **DB**: `supabase/migrations/20260904020000_households_week_start_day.sql` (new)
- **Types**: `src/shared/lib/database.types.ts` — hand-added `households.week_start_day`
  (regen-from-prod at deploy replaces it)
- **012**: `src/features/weekly-plan/components/LockWeekControl.tsx` (new) +
  `PlanPage.tsx` / `ShoppingListPage.tsx` edits
- **011**: `src/features/settings/{PlanningWeekCard.tsx,hooks.ts}` (new) + `api.ts`,
  `SettingsPage.tsx`, `weekly-plan/{date.ts,hooks.ts,api.ts}`, `dinners/CatalogPage.tsx` edits
- **009**: `src/features/weekly-plan/components/ClearPicksControl.tsx` (new) +
  `weekly-plan/{api.ts,hooks.ts}`, `dinners/CatalogPage.tsx` edits
- Tests: `LockWeekControl.test.tsx`, `ClearPicksControl.test.tsx`, `clear-selections.test.ts`
  (new) + extensions to `PlanPage`, `ShoppingListPage`, `CatalogPage`, `CookingViewPage`,
  `date`, `settings` test files

## Next

→ **Checkpoint 3 — production deploy** (user approval). See `deployment-plan.md` → Progression.
