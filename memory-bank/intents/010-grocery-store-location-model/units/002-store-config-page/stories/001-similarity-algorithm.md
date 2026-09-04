---
id: 001-similarity-algorithm
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 052-store-config-page
implemented: false
---

# Story: 001-similarity-algorithm

## User Story

**As a** household member placing a new ingredient
**I want** the system to notice it resembles one I've already placed
**So that** placing it is one tap instead of hunting through the whole path

## Acceptance Criteria

- [ ] **Given** an item name, **When** normalized, **Then** it is lowercased, stripped of
      punctuation, crudely singularized, and has stopwords removed (`organic`, `fresh`,
      `low fat`, `canned`, etc. — kept in one editable constant).
- [ ] **Given** the normalized name, **When** compared against candidates, **Then** only
      Items with an **explicit** `item_placements` row in the active store are considered —
      inherited placements are never evidence.
- [ ] **Given** two candidates, **When** scored, **Then** shared-token overlap is weighted so
      rarer tokens count more (a shared "beans" is weaker evidence than a shared "tahini");
      a shared category adds a small bonus, never enough to carry a match alone.
- [ ] **Given** `suggestion_dismissals` (unit 1, story 005), **When** scoring, **Then** any
      dismissed `(item_id, suggested_item_id)` pairing is excluded.
- [ ] **Given** the scored candidates, **When** returned, **Then** up to 3 above a confidence
      cutoff are returned, ranked with no exposed ranking (the UI shows them with equal
      weight); below cutoff, an empty list (no forced suggestion).
- [ ] **Given** the known false-friend families (_beans_, _cream_, _milk_, _oil_, _sauce_,
      _chips_), **When** tested, **Then** the algorithm is tuned toward precision — it's
      acceptable to return zero candidates for an ambiguous pair, not acceptable to return a
      confident wrong one.

## Technical Notes

- Pure function(s) in `src/features/store-config/similarity.ts` — no network call, no SQL;
  operates on data already fetched (household-scale, dozens of items).
- Unit-testable in isolation from the rest of the page.

## Dependencies

### Requires

- (Unit 1) story 005 `suggestion_dismissals`, story 004 resolution query (for "explicit
  placement" candidates)

### Enables

- 003-assign-flow

## Edge Cases

| Scenario                                                   | Expected Behavior                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| No Items have any explicit placement yet                   | Empty candidate list — fine, expected in a fresh store                                             |
| An item name is entirely stopwords after stripping         | Falls back to matching on whatever remains, or returns no candidates if nothing meaningful is left |
| Exact duplicate name (already an Item, being re-evaluated) | Excluded from its own candidate list                                                               |

## Out of Scope

- The UI presenting the suggestions (story 003)
- Recording a dismissal (story 003 writes it; this story only reads/excludes)
