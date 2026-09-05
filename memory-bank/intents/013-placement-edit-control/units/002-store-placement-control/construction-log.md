---
unit: 002-store-placement-control
intent: 013-placement-edit-control
created: '2026-09-05T19:20:00Z'
last_updated: '2026-09-05T20:05:00Z'
---

# Construction Log: 002-store-placement-control

## Original Plan

**From Inception**: 2 bolts planned

| Bolt                        | Stories       | Status       | Changes |
| --------------------------- | ------------- | ------------ | ------- |
| 056-store-placement-control | 001, 002, 003 | ✅ completed | -       |
| 057-store-placement-control | 004, 005, 006 | [ ] planned  | -       |

## Bolt 056 — Stage Trail

| Timestamp            | Stage     | Artifact                        |
| -------------------- | --------- | ------------------------------- |
| 2026-09-05T19:25:00Z | plan      | `implementation-plan.md`        |
| 2026-09-05T19:50:00Z | implement | `implementation-walkthrough.md` |
| 2026-09-05T20:05:00Z | test      | `test-walkthrough.md`           |

## Decisions

- **The five categories come from a constant, not from existing placements.** Deriving the list
  from `category_placements` rows would make an unplaced category invisible and therefore
  unplaceable — the same shape of bug that made three stops unreachable.
- **The category mutation invalidates the resolution query, not just its own.** A category move
  relocates every inheriting item, so the stops and pills change even though no
  `item_placements` row moved.
- **No cap on the all-groceries list.** A first draft capped the unsearched view at 30 rows with
  a "search to narrow" note. Removed: this bolt exists because a display cap made most of the
  registry unreachable, and answering that with a different cap invites the same class of bug
  back. The section is collapsed by default; virtualization is the answer past ~500, not
  truncation.
- **No migration.** `category_placements` already carried full policies and grants from intent
  010; this is simply the first code to write to it.

## Verification Highlights

- **The regression test was proved to fail against the bug.** The cap was temporarily reinstated
  and the suite re-run: exactly one case failed, and it was the right one. Intent 010's suites
  never got this check — they were green over code whose feature was unreachable.
- **The category-move criterion was proved at the data layer**, where the unique constraint
  lives: 7 inherited `Dairy` items moved with the category, the one explicitly-placed item stayed
  put, and exactly one `category_placements` row remained.

## Findings Raised

1. **The page test's api mock was incomplete** and masking a state — React Query logged "Query
   data cannot be undefined" while nothing failed. Fixed; the fixture now leaves one category
   deliberately unplaced.
2. **`Produce` is ambiguous in the UI**, naming both a stop and a category. Not wrong — the
   category genuinely sits at the like-named stop — but worth watching when bolt 057 adds a
   fourth section.

## Verification

| Check                                  | Result                         |
| -------------------------------------- | ------------------------------ |
| vitest                                 | 298 / 298 (32 files), from 290 |
| `tsc -b` / `eslint` / `pnpm run build` | clean                          |

## Unit Status

⏳ **In progress.** Bolt 056 complete (stories 001–003). Bolt 057 remains: the review queue,
similarity suggestions, and story 006's fixture-realism rule.

**Not deployed.** Ships with intent 013's release; intent 010's Checkpoint 4 is still open.
