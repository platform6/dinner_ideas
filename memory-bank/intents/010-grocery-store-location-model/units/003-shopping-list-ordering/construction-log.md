---
unit: 003-shopping-list-ordering
intent: 010-grocery-store-location-model
created: '2026-09-04T23:10:00Z'
last_updated: '2026-09-04T23:20:00Z'
---

# Construction Log: 003-shopping-list-ordering

## Original Plan

**From Inception**: 1 bolt planned
**Planned Date**: 2026-09-04T14:30:00Z

| Bolt ID                    | Stories  | Type                     |
| -------------------------- | -------- | ------------------------ |
| 054-shopping-list-ordering | 001, 002 | simple-construction-bolt |

## Replanning History

| Date | Action | Change | Reason | Approved |
| ---- | ------ | ------ | ------ | -------- |

## Current Bolt Structure

| Bolt ID                    | Stories  | Status       | Changed |
| -------------------------- | -------- | ------------ | ------- |
| 054-shopping-list-ordering | 001, 002 | ✅ completed | -       |

## Execution History

| Date                 | Bolt                       | Event     | Details                                                                             |
| -------------------- | -------------------------- | --------- | ----------------------------------------------------------------------------------- |
| 2026-09-04T23:10:00Z | 054-shopping-list-ordering | started   | Stage 1: Plan                                                                       |
| 2026-09-04T23:20:00Z | 054-shopping-list-ordering | completed | All 3 stages done; 290/290 frontend + 339/339 pgTAP green; unit AND intent complete |

## Execution Summary

| Metric                 | Value |
| ---------------------- | ----- |
| Original bolts planned | 1     |
| Current bolt count     | 1     |
| Bolts completed        | 1     |
| Bolts in progress      | 0     |
| Bolts remaining        | 0     |
| Replanning events      | 0     |

## Notes

The last unit of intent 010, and the last reader of the retired model:
`src/features/shopping-list/legacy-store-rows.ts` (created by bolt 052) is the only place left
in `src/` that touches `grocery_store_rows` / `category_row_assignments`. Deleting it here is
what finally satisfies the preconditions on bolt 051's deferred retirement migration (ADR-9).

**Decided with the user at this bolt's Stage 1 (2026-09-04)**: shopping-list groups stay
**category-based**; only their sort key changes, to the minimum resolved location position among
each group's items. Regrouping by location was considered and rejected — every line of FR-17,
story 001 and `storeconfig.md` says the list _sorts_ by resolved location, never that it
regroups, and regrouping would change headings, break the category-icon lookup and the
copy-to-clipboard format for scope nothing asks for.

**Unit complete 2026-09-04 — and with it, intent 010.**

`legacy-store-rows.ts` is deleted; no code path in `src/` reads the retired model. Three of the
four preconditions on `bolts/051-location-item-model/deferred-retirement-migration.sql` are now
satisfied. The fourth is an **Operations** matter: migration A
(`20260904190000_location_item_model_cutover.sql`) must be applied to production and its
in-transaction equivalence gate must pass there before migration B is moved into
`supabase/migrations/`. See ADR-9.
