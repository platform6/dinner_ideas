---
intent: 013-placement-edit-control
release: v0.11.1-6a0f5df
commit: 6a0f5df
units: [003-shopping-list-move]
created: '2026-09-08T00:00:00Z'
status: verified
supersedes: null
follows: v0.11.0-b1507bf
---

# Build Record: release v0.11.1 (intent 013 — the deferred unit)

Completes intent 013. v0.11.0 shipped units 001 and 002 on 2026-09-05 and deferred unit 003; the
product owner resumed it on 2026-09-07 after living with the store page, and it was built in bolt 058. This release is that unit and nothing else.

## Artifact

- **SQL**: **none.** `git diff origin/main..dev -- supabase/migrations/` is empty.
- **Static site**: `dist/` from `pnpm run build` — Netlify builds it from `main`
  (`command = "pnpm run build"`, `publish = "dist"`, `NODE_VERSION = 22`).
- **No Edge Function change.**
- **Not in this release**: ADR-9's destructive retirement. Still landable, still a release of its
  own — all four preconditions have held since v0.11.0.

**This is a frontend-only release**, the first of intent 013's two. That single fact removes the
ordering hazard that dominated both v0.10.0's and v0.11.0's plans: there is nothing to apply, so
there is no order to get wrong.

## Source

- Branch: `dev` @ `6a0f5df`, working tree clean. An unrelated `D3.zip` was removed by the product
  owner in `5f7d909`, the same commit that added these records; it is not part of the release
  payload
- Unreleased vs `origin/main` (`6ba1b37`, PR #16): **5 commits**

| Commit    | Contents                                          | Surface |
| --------- | ------------------------------------------------- | ------- |
| `3ab7372` | regen `database.types.ts` from prod after v0.11.0 | types   |
| `e2d18af` | v0.11.0 ops record; intent 010's finding resolved | docs    |
| `b1c627b` | intent 013 unit status sync                       | docs    |
| `0f2a837` | **bolt 058 — move from the shopping list**        | **FE**  |
| `6a0f5df` | intents 014 / 015 / 016 inception                 | docs    |

Only `0f2a837` carries runtime code. The rest is memory-bank documentation.

### A correction carried into this record

The v0.11.0 plan and this session's earlier notes both treated local `main` as the production
line. It is not — local `main` is stale at `3981644` (PR #7). The production line is
**`origin/main`**, at `6ba1b37`. Every comparison in this record is against `origin/main` after a
fetch. A diff against local `main` reports ~111 files and is meaningless.

## Code payload

```text
git diff --stat origin/main..dev -- src/ supabase/

 src/features/shopping-list/components/ShoppingListPage.test.tsx  | 322 ++++++
 src/features/shopping-list/components/ShoppingListPage.tsx       | 254 +++++-
 src/features/shopping-list/reorder.test.ts                       |  21 +-
 src/features/shopping-list/reorder.ts                            |   6 +-
 src/shared/lib/database.types.ts                                 |   5 +
 5 files changed, 574 insertions(+), 34 deletions(-)
```

`database.types.ts`'s five lines are a Supabase CLI codegen marker
(`__InternalSupabase: { PostgrestVersion: '14.5' }`) — a type-level declaration with no runtime
effect, from the post-v0.11.0 regen. It reflects schema **already applied** to production.

## Verification — 2026-09-08

| Check                  | Command                              | Result                             |
| ---------------------- | ------------------------------------ | ---------------------------------- |
| Unit + component tests | `npx vitest run`                     | ✅ **317 / 317** (32 files)        |
| Type check             | `npx tsc -b`                         | ✅ clean                           |
| Lint                   | `npx eslint .`                       | ✅ clean (see below)               |
| Production build       | `npx vite build` (Netlify's command) | ✅ green, PWA precache regenerated |
| Migration state        | `git diff … supabase/migrations/`    | ✅ **empty — no DB change**        |
| Edge Function state    | `git diff … supabase/functions/`     | ✅ **empty**                       |

The single eslint warning is `no-explicit-any` in `supabase/functions/claude-proxy/anthropic.ts`,
**pre-existing** and unrelated to this release.

### pgTAP was not run, deliberately

v0.11.0 ran 358/358 including a clean-slate reset because it shipped a migration. This release
changes no SQL, so that gate would re-prove the schema v0.11.0 already proved and would tell us
nothing about what is actually changing. Offered to the product owner at Checkpoint 1 and
declined — recorded as a decision, not an omission.

## Dependencies

**None added or changed.** No new packages, no `netlify.toml` change, no Edge Function change.

## What ships

**Unit 003 — shopping list move (bolt 058)**

- A per-item move affordance on the shopping list, opening unit 002's `AssignSheet` **unmodified**
- The list re-sorts to the new walking-path order with no page reload — which falls out of
  existing query invalidation rather than new sort logic
- Item placements only; the category-placement hooks are not imported into the feature at all
- Scroll anchored on the moved row, so a re-sort does not slide a part-checked list out from under
  someone mid-shop
- `nameKey` exported from `reorder.ts` so the move lookup and the sort share one definition of
  item identity

## Known and accepted

**Scroll preservation is verified in logic only.** jsdom has no layout engine — every
`getBoundingClientRect` is zero — so the row offsets in its test are simulated. What is proven is
the mechanism: measure before the write, measure after the new order paints, scroll by the
difference. A deliberate sabotage run confirmed that assertion has teeth.

What is **not** proven is that real browser layout lands where the arithmetic expects, especially
under the `columns: 2` desktop layout where reflow is less predictable than a single column.

→ Carried into the deployment plan as a **pre-production manual check**, not a post-deploy note.
It is the one thing in this release that testing genuinely did not cover.

**The cut criterion was met on both readings.** Unit 003 was always cuttable — the standing
question was whether the move affordance could be made discoverable without degrading the page's
primary job. The existing shopping-list suite passes with no test body altered (one import line
widened), _and_ a new case checks items off with a store configured and the affordance rendered on
every row — the gap the old suite could not cover, because it mocks the store away and so never
renders the feature at all.

## Next

→ **Checkpoint 2 / 3 — staging decision and production deploy.**
