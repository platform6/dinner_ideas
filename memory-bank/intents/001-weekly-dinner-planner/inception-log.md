---
intent: 001-weekly-dinner-planner
created: 2026-08-26T17:20:36Z
completed: 2026-08-26T17:31:13Z
status: complete
---

# Inception Log: weekly-dinner-planner

## Overview

**Intent**: Weekly dinner picker (pick 3) with auto-generated, copyable shopping list, seeded with healthy family-friendly dinners.
**Type**: green-field
**Created**: 2026-08-26

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units/{unit-name}/unit-brief.md |
| Stories | ✅ | units/{unit-name}/stories/*.md |
| Bolt Plan | ✅ | memory-bank/bolts/bolt-*.md |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 8 |
| Non-Functional Requirements | 4 |
| Units | 3 |
| Stories | 16 |
| Bolts Planned | 8 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-dinner-catalog | 3 | 2 | Must |
| 002-weekly-planning | 3 | 1 | Must |
| 003-weekly-dinner-planner-ui | 10 | 5 | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-08-26 | Household-scale scope (no multi-tenant/public product concerns) | Single family use case | Yes |
| 2026-08-26 | Exactly-3/immutability rule enforced at DB layer (trigger/constraint), not just client-side | No backend server exists to enforce it; RLS/DB is the only real boundary | Yes |
| 2026-08-26 | Variety nudging is a soft signal (Should), not a hard block on repeat selections | User wants the app to "try to present new ideas," not forbid repeats | Yes |
| 2026-08-26 | Recipe-adding UI explicitly out of scope (FR-6, Won't) but schema must accommodate it later | User named this as a future enhancement | Yes |
| 2026-08-26 | Seed dinner count raised from 20 to 50 | User wanted a full year of variety without repeats | Yes |
| 2026-08-26 | Added FR-7: suppress/un-suppress a dinner via reversible `is_active` flag | User wants to hide dinners she'll never make; kept reversible rather than a permanent delete for safety | Yes |
| 2026-08-26 | Added FR-8: a Cooking View with step-by-step instructions for the 3 picked dinners | User wants to actually cook from the app, not just plan/shop | Yes |
| 2026-08-26 | Navigation uses real routes (`react-router-dom`), one page per concern, not tabs on one screen | User is thinking ahead to future recipe-management pages (FR-6); separate pages keep that additive | Yes |

## Scope Changes

| Date | Change | Reason | Impact |
|------|--------|--------|--------|
| 2026-08-26 | FR-2/FR-3 reworked: a plan's 3 selections are freely editable (swap anytime, max 3 enforced) right up until the shopping list is copied — copying is what locks the plan, replacing the earlier "confirm immediately locks" design | Discovered during Construction (bolt 002-weekly-planning, Stage 3): user wants to keep changing picks through the week until the list is actually sent, not lock in at initial selection | `weekly_plans.confirmed_at` redesigned as `locked_at`; domain model/technical design for bolt 002-weekly-planning redone before Implement; requirements.md, unit-briefs, and stories for units 002 and 003 updated to match. No live migration existed yet for this bolt, so no rework of already-applied schema was needed. |
| 2026-08-26 | Added FR-8 (Cooking View) during bolt 003-weekly-dinner-planner-ui, Stage 1 (Plan) | User wants step-by-step cooking instructions once dinners are picked, and reasoned that separate pages (not tabs) would scale better toward future recipe management | New story `003-dinner-step-by-step-instructions` added to unit 001-dinner-catalog (already complete) via new bolt `007-dinner-catalog`; new story `010-cooking-view` added to unit 003 via new bolt `008-weekly-dinner-planner-ui`; requirements.md (FR-8 + new constraints), units.md, and both unit-briefs updated; `react-router-dom` added to bolt 003's in-progress implementation plan (was deliberately deferred pre-this-change). |

## Ready for Construction

**Checklist**:
- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin Construction Phase
2. Start with Unit: 001-dinner-catalog
3. Execute: `/specsmd-construction-agent --unit="001-dinner-catalog"`

## Dependencies

Execution order: 001-dinner-catalog → 002-weekly-planning → 003-weekly-dinner-planner-ui (bolts 003→004→005→006), with 007-dinner-catalog and 008-weekly-dinner-planner-ui added later — 007 depends only on 001-dinner-catalog (can run any time after it), and 008 depends on both 004-weekly-dinner-planner-ui and 007-dinner-catalog.
