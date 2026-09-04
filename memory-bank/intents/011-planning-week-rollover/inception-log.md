---
intent: 011-planning-week-rollover
created: '2026-09-03T22:27:55Z'
completed: '2026-09-03T23:05:00Z'
status: complete
---

# Inception Log: planning-week-rollover

## Overview

**Intent**: Give the dinner planner an explicit, visible "which week am I planning for"
window and roll the catalog picker over to a fresh, unselected set when the planning week
advances. Adds a household-configurable week-start day on `/settings`.
**Type**: brown-field (enhancement — `src/features/weekly-plan/` + catalog page + `/settings`)
**Created**: 2026-09-03

## Provenance

Routed from the Master Agent with a product-owner handoff brief (session
`session_01S8enPCjpNonbwZMttvghTV`). Idea originated in a UX discussion: the catalog shows the
household's most recent picks indefinitely because `fetchCurrentPlan` is "newest plan by
`created_at`", not week-aware. Master Agent verified the current-state facts against live
source; Inception Agent added the schema/settings cross-checks (2026-09-03).

## Artifacts Created

| Artifact       | Status                                                      | File                                  |
| -------------- | ----------------------------------------------------------- | ------------------------------------- |
| Requirements   | ✅ Checkpoint 1 + 2 approved (2026-09-03)                   | requirements.md                       |
| System Context | ✅ draft                                                    | system-context.md                     |
| Units          | ✅ draft (2 units)                                          | units.md                              |
| Stories        | ✅ 8 stories generated (2 + 6)                              | units/*/stories/                      |
| Bolt Plan      | ✅ 3 bolts (`045`, `046`, `047`) — **Checkpoint 3 pending** | memory-bank/bolts/045-_, 046-_, 047-* |

## Summary

| Metric                      | Count                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| Functional Requirements     | 9                                                                                |
| Non-Functional Requirements | 4 groups (Correctness, Architecture/Compatibility, Security/Tenancy, Regression) |
| Units                       | 2                                                                                |
| Stories                     | 8 (all Must)                                                                     |
| Bolts Planned               | 3                                                                                |

## Units Breakdown

| Unit                          | Stories | Bolts    | Priority | Gated by |
| ----------------------------- | ------- | -------- | -------- | -------- |
| 001-week-start-setting        | 2       | 045      | Must     | —        |
| 002-planning-week-rollover-ui | 6       | 046, 047 | Must     | Unit 1   |

## Decision Log

| Date       | Decision                                                                                                                                                  | Rationale                                                                                                                                                                                                           | Approved         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 2026-09-03 | Intent number `011`, name `planning-week-rollover`                                                                                                        | Next free prefix after `010-grocery-store-location-model`. Name is adjustable at Checkpoint 1.                                                                                                                      | ⏳ pending user  |
| 2026-09-03 | Week boundary is **household-configurable** (owner sets week-start day on `/settings`)                                                                    | Product owner: households differ on when they shop / turn the week over.                                                                                                                                            | ✅ product owner |
| 2026-09-03 | **Local device time**, no stored timezone                                                                                                                 | Single-family scope; matches existing `date.ts` local-time reasoning.                                                                                                                                               | ✅ product owner |
| 2026-09-03 | Rollover recomputed **on app open** only — no live midnight flip                                                                                          | Simplest correct behaviour; covers the real use (open the app, see this week).                                                                                                                                      | ✅ product owner |
| 2026-09-03 | A past week's **unlocked** plan stays **silent**                                                                                                          | It just becomes a past week, reachable via `/plan` nav; nothing deleted. A "you have an unfinished plan" nudge is a later call.                                                                                     | ✅ product owner |
| 2026-09-03 | Planning-window display **reuses `formatWeekRange()` as-is** (`"M/D – M/D"`); `MM/dd` idea dropped                                                        | Product owner: "use what was established by the date helper." One formatter, no `/plan` regression.                                                                                                                 | ✅ product owner |
| 2026-09-03 | Week-start day: **the configured day is the first day of the week**; default **Sunday**; **`week_start_day` column on `households`**; **owner-only** edit | Product-owner answers to OQ-1..OQ-4. Rides the existing `households` owner UPDATE policy.                                                                                                                           | ✅ product owner |
| 2026-09-03 | **Explicit locking is split into `012-explicit-plan-locking`**; sequence becomes **012 → 011 → 009**                                                      | Product owner: "we need a clear locking mechanism… doesn't make sense as part of copying the grocery list anymore." 011 makes no change to locking; 012 removes the meal-history risk (OQ-5) before rollover ships. | ✅ product owner |
| 2026-09-03 | Stories + bolts deferred until requirements approved (Checkpoint 2)                                                                                       | Standard Inception checkpoint order.                                                                                                                                                                                | n/a              |

## Scope Changes

None yet.

## Ready for Construction

**Checklist**:

- [x] Handoff reviewed and cross-checked against live source (households schema, RLS, date utils, plan-creation path, meal_history trigger)
- [x] Requirements documented + approved (Checkpoint 1 + 2, 2026-09-03)
- [x] Full FR/NFR set written (FR-1..FR-9)
- [x] System context defined
- [x] Units decomposed (2 units)
- [x] Stories created (8)
- [x] Bolts planned (045, 046, 047)
- [x] Human review complete (Checkpoint 3, 2026-09-03)

## Next Steps

1. **`012-explicit-plan-locking` builds first** (sequenced before this intent).
2. Then Construction for `011`: start with `001-week-start-setting`, bolt `045`.
   → `/specsmd-construction-agent --unit="001-week-start-setting" --bolt-id="045-week-start-setting"`
   then `002-planning-week-rollover-ui` bolts `046` → `047`.
3. After `011` ships: update `009-clear-picks-reset` — re-scope its framing to "mid-week reset
   within the current planning week"; its design handoff stays valid.

## Dependencies

```text
001-weekly-dinner-planner (complete) ─┐  weekly_plans, weekly_plan_selections, fetchCurrentPlan,
                                      │  fetchPlanByStartDate, useWeekByOffset, formatWeekRange,
                                      │  lock trigger, meal_history
004-account-model (complete) ─────────┤  households table + owner-only UPDATE policy, /settings page
007-claude-integration (complete) ────┘  /settings route + card layout to add the week-start card to

011-planning-week-rollover ──> 009-clear-picks-reset  (009 re-sequenced to follow 011)
```
