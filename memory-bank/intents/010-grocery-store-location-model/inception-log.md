---
intent: 010-grocery-store-location-model
created: '2026-09-04T14:11:32Z'
completed: '2026-09-04T15:00:00Z'
status: complete
---

# Inception Log: grocery-store-location-model (v2)

## Overview

**Intent**: Replace the category→row grocery-store-config model with individual
Item→Location placement, category-level fallback, a similarity-suggestion assist, and a
multi-store-ready schema — the "Walking path" page.
**Type**: brown-field (data-model remodel + migration + page rework; supersedes `001` u004)
**Created**: 2026-09-04

## Provenance

The prior `010-grocery-store-location-model` draft (created 2026-09-01) was **removed
2026-09-04** — it never passed Checkpoint 2, blocked on open questions in an earlier,
looser version of the source brief. `storeconfig.md` (repo root) was then substantially
revised: it now settles almost every open question with a chosen default, adds a full
similarity algorithm, a multi-store schema, and an exhaustive visual-direction section. This
is a fresh inception pass against that revised brief, cross-checked against live source
(`grocery_store_rows` / `category_row_assignments` household-scoping, `dinners.household_id`,
the existing `reorder_grocery_store_row` RPC, `dinner_ingredients` shape, theme tokens).

## Artifacts Created

| Artifact       | Status                                              | File                           |
| -------------- | --------------------------------------------------- | ------------------------------ |
| Requirements   | ✅ Checkpoint 2 approved (2026-09-04)               | requirements.md                |
| System Context | ✅ draft                                            | system-context.md              |
| Units          | ✅ draft (3 units)                                  | units.md                       |
| Stories        | ✅ 17 generated                                     | units/*/stories/               |
| Bolt Plan      | ✅ 5 bolts (`050`–`054`) — **Checkpoint 3 pending** | memory-bank/bolts/050-_..054-_ |

## Summary

| Metric                      | Count                                                                  |
| --------------------------- | ---------------------------------------------------------------------- |
| Functional Requirements     | 18                                                                     |
| Non-Functional Requirements | 4 groups (Security/Tenancy, Data integrity, Extensibility, Regression) |
| Units                       | 3                                                                      |
| Stories                     | 17                                                                     |
| Bolts Planned               | 5                                                                      |

## Units Breakdown

| Unit                       | FRs                      | Priority    | Complexity |
| -------------------------- | ------------------------ | ----------- | ---------- |
| 001-location-item-model    | FR-1,2,3,4,5,6,8,9,10,18 | Must        | L          |
| 002-store-config-page      | FR-7,11,12,13,14,15,16   | Must/Should | M          |
| 003-shopping-list-ordering | FR-17                    | Must        | S          |

## Decision Log

| Date       | Decision                                                                                                                         | Rationale                                                                                                                                                                                                                            | Approved         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 2026-09-04 | Prior `010` draft removed; this is a fresh pass against the revised `storeconfig.md`                                             | The revised brief closes almost every open question the old draft was stuck on; worth a clean restart rather than patching the old artifacts.                                                                                        | ✅ user          |
| 2026-09-04 | Translate every `user_id` in the source to `household_id`                                                                        | This app's real tenancy boundary since intent `004`; not a design choice, a repo convention.                                                                                                                                         | n/a (convention) |
| 2026-09-04 | Build a new **Items registry** (`items`) from scratch, backfilled once + kept in sync by a **trigger** on `dinner_ingredients`   | No such registry exists today (`dinner_ingredients` is free text). A trigger (not app code) means a future recipe-import feature (URL/Claude) needs no changes here.                                                                 | ✅ product owner |
| 2026-09-04 | Registry dedup key = case-insensitive trimmed exact match, **not** the fuzzy similarity normalization                            | Cheap, deterministic, source-agnostic. Fuzzy matching (FR-7) stays a suggestion over distinct rows — never merges the registry. A noisier future import path is self-healing via one accepted suggestion, not a data-integrity risk. | ✅ product owner |
| 2026-09-04 | Deleting a Location **deletes** dependent `item_placements`/`category_placements` rows (`on delete cascade`), not nulls a column | Keeps `location_id not null`; "no placement" = "row absent", a simple existence check for FR-6's resolution, not a null check.                                                                                                       | ✅ (Inception)   |
| 2026-09-04 | Reorder generalizes the existing **shift-based** RPC, not `storeconfig.md`'s spaced-integer scheme                               | Already proven, already race-safe, already this codebase's convention; acceptance criteria don't require literal single-row-update reorders.                                                                                         | ✅ (Inception)   |
| 2026-09-04 | Similarity algorithm (FR-7) runs **client-side in TypeScript**, not SQL/`pg_trgm`                                                | Household-scale data; matches `applyFilters`/`buildShoppingList`'s existing pattern; no new extension, no Edge Function.                                                                                                             | ✅ (Inception)   |
| 2026-09-04 | No separate design intent this time                                                                                              | `storeconfig.md`'s own "Visual direction" section is a complete prose spec — nothing needed to build unit 2 is missing.                                                                                                              | n/a (fact)       |
| 2026-09-04 | 3 units, data-model first then two parallel consumers (same shape as the removed draft)                                          | The model is the hard, blocking piece; the page and the sort are independent once it lands.                                                                                                                                          | n/a              |
| 2026-09-04 | Stories + bolts deferred until requirements approved (Checkpoint 2)                                                              | Standard Inception checkpoint order.                                                                                                                                                                                                 | n/a              |

## Scope Changes

None yet (fresh draft).

## Ready for Construction

**Checklist**:

- [x] Source (`storeconfig.md`) reviewed and cross-checked against live source
- [x] Requirements documented (draft, 18 FRs)
- [x] System context defined
- [x] Units decomposed (3 units, no open gates remaining)
- [x] Requirements approved (Checkpoint 2, 2026-09-04)
- [x] Stories created (17)
- [x] Bolts planned (050–054)
- [x] Human review complete (Checkpoint 3, 2026-09-04)

## Next Steps

1. **Construction**: start with unit `001-location-item-model`, bolt `050`.
   → `/specsmd-construction-agent --unit="001-location-item-model" --bolt-id="050-location-item-model"`
2. Then `051` (cutover) before `052`/`053` (store-config page) and `054` (shopping-list
   ordering), which can run in parallel once `051` lands.

## Dependencies

```text
001-weekly-dinner-planner u004 (model superseded) ─┐
004-account-model (complete — household RLS) ───────┤
                                                   ▼
                                       001-location-item-model
                                            │              │
                                            ▼              ▼
                              002-store-config-page   003-shopping-list-ordering
```
