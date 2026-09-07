---
id: 001-weighted-draw
unit: 001-lucky-pick
intent: 016-feeling-lucky
status: planned
priority: must
created: '2026-09-07T04:10:00Z'
assigned_bolt: 066-lucky-pick
implemented: false
---

# Story: 001-weighted-draw

## User Story

**As a** household member who cannot face deciding
**I want** the app to suggest dinners we have not had lately
**So that** the suggestion is worth taking rather than the same three again

## Acceptance Criteria

- [ ] **Given** a candidate pool and their recency, **When** the draw runs, **Then** a dinner eaten
      more recently is less likely to be chosen than one eaten longer ago.
- [ ] **Given** a dinner never eaten, **When** the draw runs, **Then** it is fully eligible — no
      history is not a penalty.
- [ ] **Given** the same inputs, **When** the draw runs twice with different random sources,
      **Then** it can produce different results. It is a **draw**, not a ranking.
- [ ] **Given** the draw, **When** implemented, **Then** it is a **pure function** taking its random
      source as an argument, so both randomness and bias are testable.
- [ ] **Given** a request for K dinners, **When** the pool holds fewer than K, **Then** it returns
      what it can rather than throwing or padding.
- [ ] **Given** the draw, **When** it returns K dinners, **Then** they are distinct.

## Technical Notes

- Recency comes from `dinner_last_chosen` (`dinner_id`, `last_chosen_date`), already a view.
- Weighting, not a hard cutoff: a cutoff needs an arbitrary N and runs out of candidates on a small
  catalog, where weighting degrades gracefully — as the pool shrinks, recent dinners become
  reachable again instead of the feature failing.
- `last-chosen.ts` already buckets recency for display (30 days, 365 days). Whether those buckets
  are the right weighting granularity is an implementation call, but reusing the existing notion of
  recency is better than inventing a second one.

## Dependencies

### Requires

- Intent 015 (for the number, consumed by 002)

### Enables

- 002-lucky-control

## Edge Cases

| Scenario                          | Expected Behavior                                    |
| --------------------------------- | ---------------------------------------------------- |
| Every dinner eaten within a week  | Still draws — weighting degrades, it does not refuse |
| A catalog of exactly K candidates | Returns all K                                        |
| An empty pool                     | Returns nothing; the caller reports it ran out       |

## Out of Scope

- The control and the writes (002)
