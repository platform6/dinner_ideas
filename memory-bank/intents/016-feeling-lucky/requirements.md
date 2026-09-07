---
intent: 016-feeling-lucky
phase: inception
status: complete
created: '2026-09-07T04:10:00Z'
updated: '2026-09-07T04:10:00Z'
---

# Requirements: I'm feeling lucky — fill the week at random

## Intent Overview

A control on the dinner catalog that fills the remaining picks for the week at random, respecting
the household's `dinners_per_week` setting and preferring dinners nobody has eaten lately.

Small, entirely client-side, and dependent on intent 015 for the number it fills to.

### Why recency matters more than it looks

With ~50 dinners and three picks a week, a uniform random draw repeats recently-eaten dinners often
enough to make the button feel broken rather than lucky. The data to avoid that already exists:
`dinner_last_chosen` (a view of `dinner_id` and `last_chosen_date`) and `meal_history`, and the
catalog already surfaces recency through `last-chosen.ts`.

So this is not "pick at random" — it is "pick at random from what we have not had recently", which
is what a person means when they ask for a suggestion.

## Business Goals

| Goal                                            | Success Metric                                                      | Priority |
| ----------------------------------------------- | ------------------------------------------------------------------- | -------- |
| Deciding what to eat stops being a chore        | One press fills the week's remaining picks                          | Must     |
| The suggestions feel fresh, not repetitive      | Recently-eaten dinners are not offered while less-recent ones exist | Must     |
| A deliberate pick is never lost to a random one | The control fills empty slots only; it never replaces a choice      | Must     |

---

## Functional Requirements

### FR-1: A lucky control on the catalog

- **Description**: A control on the dinner catalog that fills the week's remaining picks at random.
- **Acceptance Criteria**:
  - The control is on the catalog, where dinners are chosen
  - It is disabled, with the reason visible, when there is nothing it can do — the week is full,
    the plan is locked, or there are not enough eligible dinners
  - Pressing it fills the remaining slots in one action, not one dinner at a time
- **Priority**: Must

### FR-2: It fills only empty slots

- **Description**: Existing picks are kept. The control tops the week up.
- **Acceptance Criteria**:
  - Dinners already picked stay picked, and are not among the candidates
  - Exactly `dinners_per_week - (current picks)` dinners are added
  - No confirmation is needed, because nothing is destroyed
  - **Given** a locked plan, **When** the control is pressed, **Then** nothing happens — locking is
    deliberate (intent 012) and the selection triggers reject the write anyway
- **Priority**: Must

### FR-3: It honours the household's number

- **Description**: The target is `dinners_per_week`, not a constant.
- **Acceptance Criteria**:
  - A household set to 5 with 2 picked gets 3 more
  - A household at its number gets no new picks and the control says so rather than doing nothing
    silently
  - The picks are written through the ordinary selection path, so intent 015's trigger enforces the
    cap exactly as it does for hand-picked dinners
- **Priority**: Must

### FR-4: It prefers dinners you have not eaten lately

- **Description**: Candidates are drawn with a bias away from recently-eaten dinners.
- **Acceptance Criteria**:
  - A dinner eaten more recently is less likely to be drawn than one eaten longer ago or never
  - A dinner never eaten is fully eligible — no history is not a penalty
  - The draw is still **random**, not a ranking: pressing twice on the same state can give
    different answers, or the control is a sorted list with extra steps
  - Recency comes from the existing `dinner_last_chosen` view; no new table and no new query shape
- **Priority**: Must

### FR-5: Only pickable dinners are candidates

- **Description**: The pool is what the user could have chosen by hand.
- **Acceptance Criteria**:
  - Suppressed dinners (`is_active = false`) are never drawn — the user has said they do not want
    them, and a random pick must not overrule that
  - Dinners already on this week's plan are never drawn
  - **Given** fewer eligible dinners than empty slots, **When** the control is pressed, **Then** it
    fills what it can and says plainly that it ran out, rather than failing or silently
    under-filling
- **Priority**: Must

---

## Non-Functional Requirements

### Performance

- **Metric**: The draw happens client-side over the catalog already loaded; no new round trip to
  choose, only the writes to save

### Reliability

- **Metric**: A partial failure mid-fill leaves the picks that succeeded and says what happened;
  the week is never left in a state the user cannot see
- **Metric**: The cap is enforced by intent 015's trigger, not by this feature trusting its own
  arithmetic

---

## Constraints

- **Depends on intent 015.** `dinners_per_week` must exist before this can fill to it
- **No new table, no migration.** `dinner_last_chosen` and the catalog are enough
- **Writes go through the ordinary selection path** so the existing triggers apply unchanged
- **Suppression is a user decision** (intent 001 FR-7) and outranks randomness

## Resolved Decisions

| Question                                  | Decision                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Avoid recently-eaten dinners?             | **Yes — prefer least-recently-eaten**, weighted, not a hard cutoff      |
| Replace existing picks, or fill the gaps? | **Fill only the empty slots.** Non-destructive, so no confirm is needed |
| Respect suppressed dinners?               | **Yes.** Suppression is an explicit user choice                         |

Intent 009 already ships an explicit Clear Picks action, so a "replace everything" mode would
duplicate a destructive affordance that exists — clear, then press lucky.

## Priority Definitions

- **Must**: The intent is not deliverable without it.
- **Should**: Valuable, and cuttable without invalidating the rest.
