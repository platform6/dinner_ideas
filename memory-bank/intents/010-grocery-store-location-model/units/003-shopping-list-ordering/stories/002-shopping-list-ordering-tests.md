---
id: 002-shopping-list-ordering-tests
unit: 003-shopping-list-ordering
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 054-shopping-list-ordering
implemented: true
---

# Story: 002-shopping-list-ordering-tests

## User Story

**As a** developer maintaining the shopping list
**I want** the new sort key covered by tests, including an equivalence check against the old
model's output
**So that** the cutover's "no regression" promise (unit 1, FR-10) is actually verified, not
just asserted

## Acceptance Criteria

- [ ] **Given** the reworked group-ordering function, **When** tested, **Then** it covers:
      sort by resolved Location position; unassigned ingredients last, alphabetically; ties
      (two ingredients at the same Location) grouped together.
- [ ] **Given** a fixture representing a configured household **before** the cutover (old
      `category`/`row` model) and the same data **after** (new resolved-location model),
      **When** both are sorted, **Then** the resulting group order is identical — the
      equivalence check unit 1's story 007 depends on.
- [ ] **Given** the existing shopping-list test suite, **When** this story lands, **Then**
      it stays green except for the intentional sort-key assertion changes.

## Technical Notes

- The equivalence fixture is the concrete proof for unit 1's FR-10 "no regression" acceptance
  criterion — construct it once and share it if unit 1's own pgTAP tests want the same shape.

## Dependencies

### Requires

- 001-shopping-list-sort-by-location

### Enables

- None (last story of the unit)

## Edge Cases

_Covered by the acceptance criteria above._

## Out of Scope

- Unit 1's own database-level tests (pgTAP, its own story)
