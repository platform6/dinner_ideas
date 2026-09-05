---
intent: 013-placement-edit-control
release: v0.11.0-b1507bf
commit: b1507bf
units: [001-placement-review-state, 002-store-placement-control]
deferred_units: [003-shopping-list-move]
created: '2026-09-05T21:40:00Z'
status: verified
---

# Build Record: release v0.11.0 (intent 013 — placement edit control)

## Artifact

No container image, no registry. Same shape as v0.10.0:

- **SQL**: one committed migration, not yet applied to prod —
  `supabase/migrations/20260905180000_item_review_state.sql` (~160 lines). Adds
  `items.reviewed_at` (nullable, **no default**), an idempotent backfill, the
  `mark_item_reviewed(uuid)` `security definer` RPC, and appends `reviewed_at` to the
  `item_location_resolution` view.
- **Static site**: `dist/` from `pnpm run build` — Netlify builds it from `main`
  (`command = "pnpm run build"`, `publish = "dist"`, `NODE_VERSION = 22`).
- **No Edge Function change.**
- **Not in this release**: unit `003-shopping-list-move` (bolt 058), deferred by the product
  owner. `Should` priority, no dependants, nothing stranded.
- **Still not in this release**: ADR-9's destructive retirement. `grocery_store_rows` and
  `category_row_assignments` remain — and remain the rollback path.

## Source

- Branch: `dev` @ `b1507bf`, working tree clean, in sync with `origin/dev`
- Unreleased vs `origin/main`: **8 commits**

| Commit    | Contents                                                     | Surface                |
| --------- | ------------------------------------------------------------ | ---------------------- |
| `2a30936` | v0.10.0 ops record + Checkpoint 4 finding                    | docs                   |
| `3ddfb85` | intent 013 inception                                         | docs                   |
| `0e03b64` | **bolt 055 — review state**                                  | **migration** + client |
| `eb96404` | domain-model supersede note                                  | docs                   |
| `e33fdd2` | **bolt 056 — all groceries, category moves, uncapped stops** | FE                     |
| `ff24d87` | **bolt 056 — category entry on a stop**                      | FE                     |
| `d71753e` | **bolt 057 — review queue, suggestions**                     | FE                     |
| `b1507bf` | bolt 058 deferral record                                     | docs                   |

## Verification — 2026-09-05

| Check                  | Command                                  | Result                                          |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- |
| Unit + component tests | `npx vitest run`                         | ✅ **305 / 305** (32 files)                     |
| Type check             | `npx tsc -b`                             | ✅ clean                                        |
| Lint                   | `npx eslint src`                         | ✅ clean                                        |
| Production build       | `pnpm run build` (Netlify's command)     | ✅ `built in 4.15s`                             |
| pgTAP                  | `npx supabase test db`                   | ✅ **358 / 358** (20 files)                     |
| pgTAP, clean slate     | `supabase db reset` + `supabase test db` | ✅ 23-migration chain; **358 / 358**            |
| Prod migration state   | `supabase migration list --linked`       | `20260905180000` = `<NOT APPLIED>`, as expected |

Chunk-size >500 kB warning is **pre-existing**, present since before v0.9.0 — not a blocker.

## Dependencies

**None added or changed.** No new packages, no `netlify.toml` change, no Edge Function change.

## What ships

**Unit 001 — review state (bolt 055)**

- `items.reviewed_at`, backfilled so nothing predating the feature enters the queue
- `mark_item_reviewed()` — the only application write path to `items`, which carries no write
  grant (ADR-7, ADR-10)
- Intent 010's record corrected: FR-6 amended, FR-13 superseded

**Unit 002 — store placement control (bolts 056, 057)**

- **All groceries** — searchable list of every item, its stop, and how it got there
- **Category moves** — first code ever to write `category_placements`
- **Uncapped stops** — `EXPANDED_ITEM_CAP = 4` removed
- **New — needs review** — replaces the permanently-empty unassigned section
- Local similarity suggestions on review rows

## Known and accepted

**Suggestions are silent until the household places something by hand.** `findSimilarPlacedItems`
draws candidates only from explicitly placed items, and production has **zero**. The restriction
is correct — an inherited item sits where its category points, which is evidence about the
category, not the item — so widening the pool would make every suggestion restate the default.
It bootstraps: place a few things and the next arrival gets advice.

Raised at bolt 057's plan checkpoint, approved, asserted by a test, and acknowledged by the
product owner before release. **Belongs in the release notes** so it does not read as a defect.

## ADR-9 gate — migration B preconditions

| #   | Precondition                                         | State                                     |
| --- | ---------------------------------------------------- | ----------------------------------------- |
| 1   | Unit 002 reads the new model                         | ✅ (intent 010 bolt 053, extended here)   |
| 2   | Unit 003 sorts by the resolution view                | ✅ (intent 010 bolt 054)                  |
| 3   | No `src/` reference to the old tables                | ✅ only `database.types.ts` (regenerates) |
| 4   | Migration A applied to prod, equivalence gate passed | ✅ **satisfied 2026-09-05 by v0.10.0**    |

**All four now hold.** The destructive retirement is landable — as a release of its own, not a
rider on this one.

## Next

→ **Checkpoint 2 / 3 — deployment plan and production deploy.**
