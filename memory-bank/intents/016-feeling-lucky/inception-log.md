---
intent: 016-feeling-lucky
phase: inception
status: complete
created: '2026-09-07T04:10:00Z'
updated: '2026-09-07T04:10:00Z'
---

# Inception Log: 016-feeling-lucky

## Origin

`tasks.md`, second roadmap bullet: an "I'm feeling lucky" control on the dinner catalog that auto
picks the number of dinners set in the settings page, selecting randomly from the catalog.

## Why it is a separate intent from 015

It depends on 015 for the number, but it is a distinct user-facing capability with its own
questions, and keeping it separate stops 015's real database work being filed under a "feeling
lucky" heading. `tasks.md` frames them as two bullets; they stay two intents.

## Decisions

| Question              | Decision                               | Rationale                                                                                                                                                |
| --------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avoid recently-eaten? | **Yes — weighted toward least-recent** | With ~50 dinners and 3 picks a week, a uniform draw repeats often enough to make the button feel broken. The data already exists in `dinner_last_chosen` |
| Replace or fill?      | **Fill empty slots only**              | Non-destructive, so no confirm is needed; and intent 009 already ships Clear Picks for a full re-roll                                                    |
| Suppressed dinners?   | **Excluded**                           | `is_active = false` is a user decision (intent 001 FR-7); randomness must not overrule it                                                                |

Weighted rather than a hard recency cutoff: a cutoff needs an arbitrary N and runs out of
candidates on a small catalog, where weighting degrades gracefully.

## The design constraint worth recording

**The draw must be a pure function with an injected random source.** The feature's two promises are
"it is random" and "it is biased away from recent dinners", and a component calling `Math.random()`
inline can be shown to have neither. Story 003 measures the bias across many seeded draws rather
than asserting it.

The related trap: weighting must shift the odds, not decide the outcome. If pressing twice on the
same state always gives the same answer, this is a sorted list wearing a button's clothes.

## Artifacts

- `requirements.md` — 5 FRs, 0 open questions
- `system-context.md` — client-only; no migration, no new table
- `units.md` — 1 unit
- 3 stories, 1 bolt (`066`)
