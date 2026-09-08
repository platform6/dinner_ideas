---
intent: 015-dinners-per-week
release: v0.12.0-1223ed7
commit: 1223ed7
units: [001-dinners-per-week-model, 002-plan-flow-variable-n]
created: '2026-09-08T21:30:00Z'
status: verified
follows: v0.11.2-44542b4
---

# Build Record: release v0.12.0 (intent 015 — dinners per week)

Makes "3 dinners a week" a household setting. It was never a preference — it was an invariant
enforced by two Postgres triggers, asserted in a function's name, and hard-coded in nineteen places
across seven client files.

## Artifact

- **SQL — one migration**: `supabase/migrations/20260908190000_dinners_per_week.sql`, confirmed
  `<< NOT APPLIED >>` on prod. Adds `households.dinners_per_week` (`smallint not null default 3
check between 1 and 7`), rewrites the selection-cap trigger and the lock trigger to read it, and
  renames `fn_weekly_plans_require_three_on_lock` → `fn_weekly_plans_require_n_on_lock`.
- **Static site**: `dist/` from `pnpm run build` — Netlify builds it from `main`.
- **No Edge Function change. No RLS change. No new table.**

## Source

- Branch: `dev` @ `1223ed7`, working tree clean
- Unreleased vs `origin/main` (`050b410`, PR #19): **6 commits**

| Commit    | Contents                                     | Surface               |
| --------- | -------------------------------------------- | --------------------- |
| `a8b9cc9` | v0.11.2 ops record; bolt 058 scroll verified | docs                  |
| `3dfd947` | intent 004 frontend smoke performed          | docs                  |
| `2c22867` | **bolt 063 — the rule**                      | **migration** + pgTAP |
| `26a319d` | design-doc correction                        | docs                  |
| `b1342ee` | **bolt 064 — the /settings control**         | FE                    |
| `1223ed7` | **bolt 065 — the client sweep**              | FE                    |

## Code payload

```text
16 source/test files + 1 migration + 2 pgTAP files
810 insertions(+), 58 deletions(-)
```

## Verification — 2026-09-08

| Check                  | Command                                  | Result                           |
| ---------------------- | ---------------------------------------- | -------------------------------- |
| pgTAP, clean slate     | `supabase db reset` + `supabase test db` | ✅ **370 / 370** (20 files)      |
| Unit + component tests | `npx vitest run`                         | ✅ **331 / 331** (32 files)      |
| Type check             | `npx tsc -b`                             | ✅ clean                         |
| Lint                   | `npx eslint src`                         | ✅ clean                         |
| Production build       | `npx vite build`                         | ✅ green                         |
| Prod migration state   | `supabase migration list --linked`       | `20260908190000` **not applied** |

## Dependencies

**None added or changed.**

## What ships

- `households.dinners_per_week`, 1–7, default 3
- Both triggers read it; the misnamed lock function is renamed
- An owner-editable control on `/settings`, inside the Planning week card
- Seven client files follow the number: catalog badge/capacity/card-disabling, plan page full
  state + nudge + lock, shopping-list and cooking-view gates, both data hooks

## Known and accepted

**`database.types.ts` is currently AHEAD of production.** It was regenerated from `--local` in bolt
064, because the column exists only locally until this migration ships. Every prior regen in this
project was `--linked`.

→ **A routine `--linked` regen before this deploy would silently revert it and break the build.**
The trap disappears the moment the migration is applied. Worth knowing during the deploy window,
not after.

**Two findings recorded during construction rather than glossed:**

- The `20260827002830` concurrency guarantee is **not** directly tested, here or anywhere — a
  two-session race cannot run inside one pgTAP transaction. The suite asserts the `for update` is
  still present in the function source, labelled as a proxy.
- `PlanPage` and `CookingViewPage` gained no new component tests. Their changes are the same shape
  as the two files that did, and their existing suites pass, but a regression at a non-default N
  would not be caught there.

## Next

→ **Checkpoint 2 / 3 — staging decision and production deploy.** This release carries a migration
_and_ frontend that depends on it, so ordering matters again.
