---
intent: 014-recipe-entry
phase: inception
status: complete
created: '2026-09-07T02:00:00Z'
updated: '2026-09-07T03:20:00Z'
---

# Inception Log: 014-recipe-entry

## Timeline

- **2026-09-07T02:00:00Z**: Intent created from the product owner's request — a page for entering
  new recipes, manually and by URL import, with ingredients assigned to grocery store sections.
- **2026-09-07T02:05:00Z**: Codebase survey before asking anything. Three findings shaped the
  intent more than the questions did.
- **2026-09-07T02:20:00Z**: Checkpoint 1 — clarifying questions answered.
- **2026-09-07T02:30:00Z**: Requirements drafted, then **corrected** after product-owner pushback.
- **2026-09-07T02:40:00Z**: Checkpoint 2 — requirements approved.
- **2026-09-07T03:10:00Z**: Context, units, stories and bolt plan generated.
- **2026-09-07T03:20:00Z**: Checkpoint 3 — all three open questions answered and propagated;
  story 008 (tag editor) added, FR-10 added, bolt 060's migration made certain.

## What the survey found

1. **This intent was anticipated.** `claude-proxy`'s README says its contract is "frozen — bolt 039
   and intent 009 recipe-import build against it", and intent 007 named recipe import as the next
   intent. The reuse contract is explicit: add a caller, do not touch the proxy.
2. **The items registry already expects it.** ADR-7 (bolt 050) reasoned about "a future
   recipe-import intent... that will write `dinner_ingredients` through code paths that do not
   exist yet", and made the sync a trigger for that reason. No registry code is needed here.
3. **Nothing in the stack can fetch a URL.** The proxy is text-only and frozen, the browser is
   CORS-blocked by essentially every recipe site, and there is no tool use.

## Decisions

| Decision                                         | Rationale                                                                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paste page text rather than import by URL        | Product owner's call after weighing the trade. Paste is simpler _and_ more reliable — the browser has already rendered the page, so the text is cleaner than a fetcher's HTML, and paywalled / JS / bot-blocking sites all work |
| Oversize pastes trim from the end, with a notice | The recipe sits near the top of every recipe page; comment sections are the tail and the usual cause of overflow                                                                                                                |
| Category only, not walking-path stops            | `category` is required by the schema anyway and already drives placement; per-item stops are `/store`'s job (intent 013), and the review queue catches new groceries                                                            |
| Create only; review before saving                | Smallest surface that keeps a bad extraction out of the catalog                                                                                                                                                                 |
| Two units, split at the Claude boundary          | Unit 001 is fully useful with no API key; unit 002 is an accelerator that can be cut cleanly                                                                                                                                    |

## The correction that mattered

The first requirements draft asserted that the founding recipes were "one sentence" of
instructions, and Question 3 offered "match the seed format exactly" **described as meaning no
steps** — on the stated grounds that no existing recipe had any.

The product owner pushed back: _"I don't think it is true that all the recipes are one sentence...
I want to make sure important steps are not dropped from the imported recipes."_

Checking the data rather than defending the claim showed both parts of the assertion were wrong:

- Instructions: 26 of 50 are one sentence, 13 are two, 11 are three — and even the one-sentence
  ones carry every step, separated by semicolons and commas.
- **All 50 dinners have `dinner_steps` rows** — 34 with four steps, 16 with five. The schema
  comment is explicit that `instructions` is "a one-line summary... distinct from" the steps, which
  exist for the cooking view.

So matching the seed format _requires_ steps; the option as offered would have produced recipes
that were second-class in the one view meant for cooking from, and an instruction to "compress to
one sentence" would have caused exactly the step-dropping the product owner was worried about.

Requirements were rewritten around a two-layer format, with FR-5 restated as hard rules — no step
dropped, merging permitted, omission never; details preserved; the summary derived from the steps —
and a new reliability metric making a step-less extraction a **failed** extraction rather than a
saveable draft.

Recorded here because the failure mode is general: four recipes are not a sample, and a schema
comment ("distinct from dinners.instructions, which stays as a one-line summary") had the answer
the whole time.

## Resolved Decisions

All three open questions were answered at Checkpoint 3, before construction.

| #   | Question                                              | Decision                                                              | Landed in                        |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| 1   | Should entry offer the existing tag vocabulary?       | **Yes — and import infers them**                                      | FR-2, FR-10; story 008; bolt 061 |
| 2   | Does an abandoned import still burn a daily-cap call? | **Yes, accepted.** No refund mechanism exists and none is being built | Unit 002's constraints           |
| 3   | Fix `dinners.name` uniqueness to per-household?       | **Yes** — an additive migration in this intent                        | FR-8; story 005; bolt 060        |

### Two consequences worth recording

**Decision 1 needed a bound.** `tags` is an open, user-created vocabulary with no seed, and it
contains `rosie-approved`, which drives a visible heart in the catalog and means _a family member
liked this dinner_. Left unbounded, inference could both sprawl the vocabulary with near-duplicates
and fabricate a person's opinion.

So FR-10 bounds it: the model may propose **only from tags that already exist**, anything else is
dropped rather than created, and **`rosie-approved` is excluded from the vocabulary sent and
rejected if returned**. A person may still attach it by hand — that is exactly what it is for.

**Decision 3 removed the last doubt about unit 001's shape.** It ships a migration either way now,
so bolt 060's ADR must judge the atomicity options purely on whether the invariant holds. "Avoids a
migration" is no longer a point in favour of client-side compensation, and the bolt says so
explicitly to stop that argument being made later from a stale premise.

No open questions remain.

## Artifacts

- `requirements.md` — 10 FRs, NFRs, constraints, 0 open questions
- `system-context.md` — context diagram, boundaries, the transaction problem
- `units.md` — 2 units, split at the Claude boundary
- `units/001-recipe-manual-entry/` — 8 stories
- `units/002-recipe-import/` — 6 stories
- `memory-bank/bolts/059`–`062` — 4 bolts
