---
intent: 013-placement-edit-control
created: '2026-09-05T16:45:00Z'
completed: '2026-09-05T17:45:00Z'
status: complete
---

# Inception Log: placement-edit-control

## Overview

**Intent**: Give the household final say over where groceries sit — move a single item or a
whole category to any stop, find anything by name, and start the move from either `/store` or
the shopping list where the mismatch was actually noticed.
**Type**: brown-field (design refinement — extends `010`, does not rebuild it)
**Created**: 2026-09-05

## Provenance

Found on production within minutes of the `v0.10.0` deploy: searching "Not on the path yet" for
`spaghetti` returned nothing. Diagnosed during Operations Checkpoint 4 for intent `010` and
recorded in that intent's `deployment/deployment-plan.md` under **POST-DEPLOY FINDING**.
Intent `010`'s Checkpoint 4 is held open pending this work.

Classified as a **design refinement, not a defect**. Product owner: _"I think the registry is
sound and functions as intended however I don't think the plain user experience flow was
integrated into the intention. This most likely was my miss as I assumed it was obvious that
the user should have ultimate edit control over where items are placed."_

Two gaps, one of which was not part of the original report:

1. **Item-level placement is unreachable** — every item resolves as `inherited`, so the
   unassigned-only section is empty by construction; the fallback entry point is capped at four
   items per stop. ~20 of 121 items reachable.
2. **Category-level placement was never writable at all** — `category_placements` is read and
   counted by the UI but never written. Found while investigating the first gap, and arguably
   the higher-leverage half: moving `Dairy` moves eight items at once, and it is what makes a
   category-less stop like `Bakery` meaningful.

## Checkpoint 1 — Clarifying questions (2026-09-05)

Resolved with the product owner:

| Question                                   | Answer                                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Is placement a habit or a rare correction? | **Habit.** _"I want to be able to move things freely if I find they are not in the right category/aisle."_           |
| Which level of control?                    | **Both** item and category — bulk by category, exceptions by item                                                    |
| How do you find the thing you are moving?  | **Searchable list of all groceries**, replacing the unassigned-only section                                          |
| Where can a move be triggered?             | **`/store` and the shopping list** — fix it where you noticed it                                                     |
| Is `Garmantasdf` real?                     | **Yes**, a test row; the owner wants to place test items on it manually. A genuine use case for a category-less stop |
| Urgency?                                   | **None.** _"we're just building, iterating, refining."_ Not a hotfix                                                 |

### Second round — recipe import raised (same session)

The product owner then raised the flow that actually motivates all of this: import ten recipes
through the Claude UI, go to the shopping list, find three ingredients that _"just didn't match
what I have"_, and either run a hook to have Claude match them or match them by hand.

Three findings came out of investigating it:

1. **Recipe import does not exist.** `callClaude` is generic, working transport whose only
   production consumer is the "Test connection" button in `ClaudeAiCard.tsx`. Intents `007`/`008`
   built proxy, key vault, rate limiting and usage logging with no feature on top.
2. **"Didn't match" is not a representable state.** `dinner_ingredients.category` is `NOT NULL`
   over five values, so a new ingredient always inherits a stop and never surfaces as unmatched.
   It lands silently, possibly wrong.
3. **`items` has a SELECT policy only** — deliberately trigger-owned per ADR-7. Any review-state
   write must not open `items.name` to application writes.

| Question                                  | Answer                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Scope split, given import does not exist? | **`013`** = manual control + review state + local similarity. **`014`** = recipe import + Claude matching escalation |
| What marks an item reviewed?              | **Explicit confirm or move**, via a nullable `items.reviewed_at`; existing items backfilled as reviewed              |
| What proposes a stop for a new item?      | **Local similarity first**; Claude only as escalation, and that escalation is `014`'s                                |

An earlier framing of these questions was withdrawn before it was answered: it had been drafted
before the category-level gap was found, and offered a choice between fixing the section and
uncapping the rows — a narrower set of options than the problem warranted.

## Decisions

| #   | Decision                                                         | Rationale                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | New intent rather than reopening `010`                           | Matches `003-frontend-review-remediation` and `008-claude-proxy-review-remediation`; `010` is shipped and its deployment record stays clean                                                                                        |
| D2  | Refinement, not defect-fix                                       | `010`'s registry, resolution view and cutover all do exactly what `010` specified. The missing requirement was never written, so nothing was built wrong                                                                           |
| D3  | ~~Delete the unassigned section~~                                | Superseded by **D7**. The reasoning held only while the alternative was "list everything": a section scoped to a state that never occurs has nothing to do. Once the review state existed, the section had a real population again |
| D4  | Amend `010`'s FR-6 in place rather than silently leave it        | It describes `unassigned` as a normal, common state. It is the orphan case. The record gets corrected with a pointer here, not rewritten                                                                                           |
| D5  | Shopping-list moves write item placements only                   | Moving from the list means "this thing is here", not "everything like it is here"                                                                                                                                                  |
| D6  | ~~No schema change expected~~ → **one small additive migration** | Superseded in the second round. `010`'s migration A covers everything except the review state, which needs `items.reviewed_at`, a backfill, and a write path that preserves ADR-7's trigger-owned invariant                        |
| D7  | Re-scope the section rather than delete it                       | The first draft's FR-5 removed `010`'s unassigned section outright. The import discussion showed the section was never the wrong _idea_ — "items with no location" was the wrong _population_. Re-scoped to "New — needs review"   |
| D8  | Review state is explicit, not derived                            | Deriving it ("no explicit placement") would put all 121 items in the queue on day one and mean accepting a category default never clears. A nullable timestamp says what is actually meant: nobody has looked                      |
| D9  | Backfill existing items as reviewed                              | Nobody has had the means to review anything yet, so "reviewed" here means "predates the feature". The alternative is a day-one queue of 121 items, which teaches the user to ignore it                                             |
| D10 | Local similarity in `013`, Claude in `014`                       | `010` already ships a similarity engine that costs nothing and needs no API key. It should be the default answer; an API call earns its cost only on what similarity cannot resolve                                                |

## Artifacts Created

| Artifact       | Status | File                             |
| -------------- | ------ | -------------------------------- |
| Requirements   | ✅     | requirements.md                  |
| System Context | ✅     | system-context.md                |
| Units          | ✅     | units.md + units/*/unit-brief.md |
| Stories        | ✅     | units/_/stories/_.md (11)        |
| Bolt Plan      | ✅     | memory-bank/bolts/055..058       |
| Story Index    | ✅     | memory-bank/story-index.md       |

## Summary

| Metric                  | Count |
| ----------------------- | ----- |
| Functional Requirements | 8     |
| Units                   | 3     |
| Stories                 | 11    |
| Bolts Planned           | 4     |

## Log

| Timestamp            | Event                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-05T16:45:00Z | Intent created; Checkpoint 1 round 1 resolved; requirements drafted (FR-1..FR-6)                                                        |
| 2026-09-05T17:15:00Z | Recipe-import flow raised; round 2 resolved; requirements rewritten (FR-1..FR-8) — review state added, section re-scoped, 014 split out |
| 2026-09-05T17:30:00Z | Checkpoint 2 approved; context, units, 11 stories and 4 bolts generated; story index updated                                            |
