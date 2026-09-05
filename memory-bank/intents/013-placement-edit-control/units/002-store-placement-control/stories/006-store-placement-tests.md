---
id: 006-store-placement-tests
unit: 002-store-placement-control
intent: 013-placement-edit-control
status: complete
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 057-store-placement-control
implemented: true
---

# Story: 006-store-placement-tests

## User Story

**As a** future maintainer
**I want** these tests to fail when the feature becomes unreachable
**So that** intent 013 does not repeat intent 010's mistake — passing suites over a state the
real data never produces

## Acceptance Criteria

- [ ] **Given** the all-groceries list, **When** tested, **Then** a case asserts an
      **inherited** item is findable by search and movable — the exact thing that was impossible
      before this intent.
- [ ] **Given** a category move, **When** tested, **Then** a case asserts inheriting items move
      **and** an explicitly-placed item does not — the resolution order from intent 010 FR-6,
      verified rather than assumed.
- [ ] **Given** stop rows, **When** tested, **Then** a case asserts a stop with more than four
      items lists all of them, and that the collapsed count equals the true total.
- [ ] **Given** the review queue, **When** tested, **Then** cases cover: an unreviewed inherited
      item appears; accepting clears it without writing a placement; moving clears it and writes
      one.
- [ ] **Given** fixtures across this unit, **When** written, **Then** they are built from a
      **realistic placement distribution** — every item inherited, none unassigned — not from
      hand-constructed states the model cannot reach. Where a test needs an unassigned item, it
      must construct a genuine registry orphan.
- [ ] **Given** the removed section, **When** the suite runs, **Then** no orphaned test asserts
      the old unassigned-only behaviour.

## Technical Notes

- The fixture rule in the fifth criterion is the point of this story. Intent 010's component
  tests passed while the feature was unreachable in production, because they constructed
  `unassigned` items directly. A fixture that cannot occur in production proves nothing about
  production.
- Consider a shared fixture helper that builds a household resembling the real one: five
  categories placed, three category-less stops, everything inherited.
- Existing suites to update rather than duplicate: `StoreConfigPage.test.tsx`,
  `UnassignedSection.test.tsx`, `AssignSheet.test.tsx`.

## Dependencies

### Requires

- 001-all-groceries-list
- 002-category-move
- 003-uncapped-stop-rows
- 004-needs-review-section
- 005-similarity-suggestion-on-review

### Enables

- None

## Out of Scope

- pgTAP coverage of the review write path — that belongs to unit 001, story 002
