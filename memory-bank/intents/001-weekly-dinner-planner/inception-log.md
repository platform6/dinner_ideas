---
intent: 001-weekly-dinner-planner
created: 2026-08-26T17:20:36Z
completed: 2026-08-26T17:31:13Z
updated: 2026-08-27T08:15:00Z
status: complete
---

# Inception Log: weekly-dinner-planner

## Overview

**Intent**: Weekly dinner picker (pick 3) with auto-generated, copyable shopping list, seeded with healthy family-friendly dinners.
**Type**: green-field
**Created**: 2026-08-26

## Artifacts Created

| Artifact       | Status | File                            |
| -------------- | ------ | ------------------------------- |
| Requirements   | ✅     | requirements.md                 |
| System Context | ✅     | system-context.md               |
| Units          | ✅     | units/{unit-name}/unit-brief.md |
| Stories        | ✅     | units/{unit-name}/stories/*.md  |
| Bolt Plan      | ✅     | memory-bank/bolts/bolt-*.md     |

## Summary

| Metric                      | Count |
| --------------------------- | ----- |
| Functional Requirements     | 12    |
| Non-Functional Requirements | 4     |
| Units                       | 4     |
| Stories                     | 24    |
| Bolts Planned               | 13    |

## Units Breakdown

| Unit                         | Stories | Bolts | Priority |
| ---------------------------- | ------- | ----- | -------- |
| 001-dinner-catalog           | 4       | 3     | Must     |
| 002-weekly-planning          | 4       | 2     | Must     |
| 003-weekly-dinner-planner-ui | 14      | 7     | Must     |
| 004-grocery-store-config     | 2       | 1     | Must     |

## Decision Log

| Date       | Decision                                                                                                                                       | Rationale                                                                                                                                                                       | Approved |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2026-08-26 | Household-scale scope (no multi-tenant/public product concerns)                                                                                | Single family use case                                                                                                                                                          | Yes      |
| 2026-08-26 | Exactly-3/immutability rule enforced at DB layer (trigger/constraint), not just client-side                                                    | No backend server exists to enforce it; RLS/DB is the only real boundary                                                                                                        | Yes      |
| 2026-08-26 | Variety nudging is a soft signal (Should), not a hard block on repeat selections                                                               | User wants the app to "try to present new ideas," not forbid repeats                                                                                                            | Yes      |
| 2026-08-26 | Recipe-adding UI explicitly out of scope (FR-6, Won't) but schema must accommodate it later                                                    | User named this as a future enhancement                                                                                                                                         | Yes      |
| 2026-08-26 | Seed dinner count raised from 20 to 50                                                                                                         | User wanted a full year of variety without repeats                                                                                                                              | Yes      |
| 2026-08-26 | Added FR-7: suppress/un-suppress a dinner via reversible `is_active` flag                                                                      | User wants to hide dinners she'll never make; kept reversible rather than a permanent delete for safety                                                                         | Yes      |
| 2026-08-26 | Added FR-8: a Cooking View with step-by-step instructions for the 3 picked dinners                                                             | User wants to actually cook from the app, not just plan/shop                                                                                                                    | Yes      |
| 2026-08-26 | Navigation uses real routes (`react-router-dom`), one page per concern, not tabs on one screen                                                 | User is thinking ahead to future recipe-management pages (FR-6); separate pages keep that additive                                                                              | Yes      |
| 2026-08-27 | Generic `tags` system fully replaces `rosie_approved` boolean (FR-9) — no auto-migration of old approved dinners into a tag                    | User confirmed after seeing the app live: wants real tagging, not a special-cased kid-friendly flag; comfortable starting untagged                                              | Yes      |
| 2026-08-27 | Tag entry normalized to lowercase on save, matched by exact lowercase comparison                                                               | User explicitly requested this to avoid duplicate tags from casing differences                                                                                                  | Yes      |
| 2026-08-27 | New `meal_history` table written on plan lock, distinct from just reading `weekly_plans`/`locked_at`                                           | User wants an explicit eaten-history record rather than inferring "eaten" from lock timestamp + date                                                                            | Yes      |
| 2026-08-27 | Week navigation uses ◀ / ▶ one-week-at-a-time arrows with a date-range header (e.g. "8/23 – 8/29")                                             | User specified this exact interaction directly                                                                                                                                  | Yes      |
| 2026-08-27 | Real-time/optimistic pick-flow redesign (originally raised as a bug: "selection isn't real-time enough") explicitly deferred out of this round | User doesn't yet have the UX clear in mind and wants to model it on Blue Apron — agreed to a dedicated future Inception pass instead of guessing now                            | Yes      |
| 2026-08-27 | Grocery store config added as new Unit 4 (`004-grocery-store-config`) rather than folded into an existing unit                                 | Introduces a new domain concept (ordered store rows) distinct from dinner-catalog/weekly-planning; kept category-level only (no per-ingredient override) per user's description | Yes      |

## Scope Changes

| Date       | Change                                                                                                                                                                                                                             | Reason                                                                                                                                                                                                                                       | Impact                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-26 | FR-2/FR-3 reworked: a plan's 3 selections are freely editable (swap anytime, max 3 enforced) right up until the shopping list is copied — copying is what locks the plan, replacing the earlier "confirm immediately locks" design | Discovered during Construction (bolt 002-weekly-planning, Stage 3): user wants to keep changing picks through the week until the list is actually sent, not lock in at initial selection                                                     | `weekly_plans.confirmed_at` redesigned as `locked_at`; domain model/technical design for bolt 002-weekly-planning redone before Implement; requirements.md, unit-briefs, and stories for units 002 and 003 updated to match. No live migration existed yet for this bolt, so no rework of already-applied schema was needed.                                                                                                                                |
| 2026-08-26 | Added FR-8 (Cooking View) during bolt 003-weekly-dinner-planner-ui, Stage 1 (Plan)                                                                                                                                                 | User wants step-by-step cooking instructions once dinners are picked, and reasoned that separate pages (not tabs) would scale better toward future recipe management                                                                         | New story `003-dinner-step-by-step-instructions` added to unit 001-dinner-catalog (already complete) via new bolt `007-dinner-catalog`; new story `010-cooking-view` added to unit 003 via new bolt `008-weekly-dinner-planner-ui`; requirements.md (FR-8 + new constraints), units.md, and both unit-briefs updated; `react-router-dom` added to bolt 003's in-progress implementation plan (was deliberately deferred pre-this-change).                   |
| 2026-08-27 | Post-deployment enhancement round: added FR-9–FR-12 (generic tags, expandable catalog card details, past/future week navigation + eaten history, grocery store row config) after the user started using the deployed app           | User navigated the live site and identified 4 concrete gaps/wants; a 5th item (real-time pick-flow feel) was raised but deferred to a future dedicated UX Inception pass, and a 6th (recipe-URL import) was logged as future work under FR-6 | requirements.md: added FR-9–FR-12, updated Open Questions. units.md: updated units 001–003 scope/deliverables, added new Unit 4 (`004-grocery-store-config`). New unit-brief for 004; unit-briefs for 001–003 updated. 8 new stories created across units 001 (1), 002 (1), 003 (4), 004 (2). 5 new bolts planned: `009-dinner-catalog`, `010-weekly-planning`, `011-grocery-store-config`, `012-weekly-dinner-planner-ui`, `013-weekly-dinner-planner-ui`. |

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

## Enhancement Round Complete (2026-08-27)

All 5 bolts from the post-deployment enhancement round (FR-9–FR-12) are complete: `009-dinner-catalog` (tags schema), `010-weekly-planning` (meal_history schema, via `ADR-002`), `011-grocery-store-config` (new unit — schema + reorder RPC), `012-weekly-dinner-planner-ui` (card details + tag UI), `013-weekly-dinner-planner-ui` (week navigation + store config page). 98/98 tests passing, `npx tsc -b`/`eslint`/`vite build` all clean. Intent status confirmed `complete` with zero inconsistencies via `status-integrity.cjs`.

Also fixed two pieces of tooling discovered along the way: a CRLF-line-ending bug in `bolt-complete.cjs`/`status-integrity.cjs`/`artifact-validator.cjs` that silently broke frontmatter parsing on Windows-saved files, and their intent-status cascade trusting a stale `unit-brief.status` field instead of cross-referencing actual bolt completion.

Remaining open items (see `requirements.md` Open Questions), not part of this round:

- Real-time/optimistic redesign of the pick-3 flow — explicitly deferred to a future, dedicated UX-focused Inception pass.
- Recipe-URL import (FR-6) — logged as future work, not started.
- Whether `004-grocery-store-config`'s category-level granularity needs a per-ingredient override — open only if it proves insufficient in practice.
