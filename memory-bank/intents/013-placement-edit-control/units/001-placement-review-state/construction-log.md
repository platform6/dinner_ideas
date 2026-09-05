---
unit: 001-placement-review-state
intent: 013-placement-edit-control
created: '2026-09-05T18:00:00Z'
last_updated: '2026-09-05T19:00:00Z'
---

# Construction Log: 001-placement-review-state

## Original Plan

**From Inception**: 1 bolt planned

| Bolt                       | Stories       | Status       | Changes |
| -------------------------- | ------------- | ------------ | ------- |
| 055-placement-review-state | 001, 002, 003 | ✅ completed | -       |

Executed as planned. No replanning, no split.

## Stage Trail

| Timestamp            | Stage        | Artifact                                                   |
| -------------------- | ------------ | ---------------------------------------------------------- |
| 2026-09-05T18:05:00Z | model        | `ddd-01-domain-model.md`                                   |
| 2026-09-05T18:15:00Z | design       | `ddd-02-technical-design.md`                               |
| 2026-09-05T18:25:00Z | adr-analysis | `adr-010-narrow-write-to-a-trigger-owned-table.md`         |
| 2026-09-05T18:45:00Z | implement    | `supabase/migrations/20260905180000_item_review_state.sql` |
| 2026-09-05T19:00:00Z | test         | `ddd-03-test-report.md`                                    |

## Decisions

- **ADR-10** — open a trigger-owned table with a function, not a column grant. `items` keeps zero
  application write privileges; `mark_item_reviewed()` is the only door and it names one column.
  Chosen over a column-scoped grant because that would rest the invariant on a privilege being
  _absent_, which a later blanket grant would dissolve silently.
- **Review is per-Item, not per-Store** — correct while `stores_one_active_per_household` holds.
  Recorded as an accepted simplification rather than left implicit.
- **`reviewed_at` projected through `item_location_resolution`** rather than read separately —
  unit 002 already queries those rows.

## Corrections

- **Story 001 AC-3 amended at the Stage 2 checkpoint.** The inception-stage requirement for a
  snapshot-bounded backfill does not narrow the race it was meant to close: rows committing after
  the statement stay null for free under READ COMMITTED, and rows committing before it are
  indistinguishable from pre-existing ones. The migration uses `where reviewed_at is null`, which
  earns its place for idempotency. Residual accepted and documented in the migration.

## Findings Raised

1. **ADR-10's premise verified** — `items` carries no application write grant (intent 010 line
   469 revokes them explicitly). The invariant is maintained, not accidental.
2. **A second, previously unrecorded defect in intent 010's FR-13** — its default scope
   intersects "used in a recipe" with "unassigned", which are contradictory. That list could
   never have shown anything, independently of the empty-population problem. Recorded in intent
   010's requirements.
3. **`TRUNCATE` granted to `authenticated` project-wide** — Supabase default, pre-existing, not
   reachable via PostgREST. Not acted on; on file.
4. **Rename mints a new Item and orphans the old** — confirmed, pre-existing since intent 010,
   made _visible_ by this bolt. Deferred to intent 013's open question on orphan handling.

## Verification

| Check                                  | Result                                |
| -------------------------------------- | ------------------------------------- |
| pgTAP                                  | 358 / 358 (20 files), from 339        |
| pgTAP, clean slate                     | 23-migration chain applies; 358 / 358 |
| vitest                                 | 290 / 290 (32 files)                  |
| `tsc -b` / `eslint` / `pnpm run build` | clean                                 |

## Unit Status

✅ **Complete.** All three stories delivered. Enables bolts 056 and 058.

**Not deployed.** The migration is committed but unapplied on production — intent 010's
Checkpoint 4 is still open, and this unit ships as part of intent 013's release, not on its own.
