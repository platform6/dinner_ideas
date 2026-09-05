---
id: 005-similarity-suggestion-on-review
unit: 002-store-placement-control
intent: 013-placement-edit-control
status: planned
priority: should
created: '2026-09-05T17:30:00Z'
assigned_bolt: 057-store-placement-control
implemented: false
---

# Story: 005-similarity-suggestion-on-review

## User Story

**As a** household member working through a review queue
**I want** the app to propose where each new grocery probably goes
**So that** reviewing is mostly confirming, not deciding

## Acceptance Criteria

- [ ] **Given** an unreviewed item, **When** its row renders and the similarity engine finds a
      match clearing the existing confidence cutoff, **Then** the row surfaces that stop, phrased
      as intent 010 FR-7 already does — naming the similar item ("you put burger buns here").
- [ ] **Given** a surfaced suggestion, **When** accepted, **Then** the item is placed at that
      stop and marked reviewed in **one** action.
- [ ] **Given** nothing clears the cutoff, **When** the row renders, **Then** it simply shows
      the inherited stop with no suggestion block — consistent with intent 010 FR-12, which omits
      rather than announcing an absence.
- [ ] **Given** a previously dismissed pairing, **When** suggestions are computed, **Then** it is
      excluded, honouring `suggestion_dismissals` from intent 010 FR-8.
- [ ] **Given** the whole feature, **When** it runs, **Then** it makes **no** network call and
      requires **no** API key — it works for a household that has never configured Claude.
- [ ] **Given** the review list, **When** it first paints, **Then** computing suggestions does
      not delay it.

## Technical Notes

- Reuses `similarity.ts` from bolt 052 unchanged. This story adds a caller, not an algorithm.
- The Claude-assisted escalation for what similarity cannot resolve is **intent 014**, and is
  explicitly not part of this story. Keeping the local path first means the feature costs
  nothing by default and degrades to manual placement rather than to nothing.
- If suggestion computation over a long queue proves expensive, computing lazily per visible row
  is preferable to dropping the feature — but measure before optimising.

## Dependencies

### Requires

- 004-needs-review-section

### Enables

- Intent 014's Claude escalation (which slots in where this story finds nothing)

## Edge Cases

| Scenario                                          | Expected Behavior                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| A household with no placed items yet              | Nothing to be similar to; no suggestions, no error                 |
| The suggested stop is the one it already inherits | Suggestion is redundant — suppress it rather than offering a no-op |
| Every suggestion for an item has been dismissed   | No suggestion block; the row still offers accept and move          |

## Out of Scope

- Any change to the similarity algorithm or its cutoff
- Any Claude/API call
