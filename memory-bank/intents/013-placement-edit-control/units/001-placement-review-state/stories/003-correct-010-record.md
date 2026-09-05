---
id: 003-correct-010-record
unit: 001-placement-review-state
intent: 013-placement-edit-control
status: planned
priority: should
created: '2026-09-05T17:30:00Z'
assigned_bolt: 055-placement-review-state
implemented: false
---

# Story: 003-correct-010-record

## User Story

**As a** future reader of intent `010`
**I want** its requirements to describe what the system actually does
**So that** I do not build against a state the data model cannot produce, the way this intent's
predecessor did

## Acceptance Criteria

- [ ] **Given** `010`'s requirements.md FR-6, **When** amended, **Then** it states that
      `unassigned` is reachable **only** for registry orphans — Items with no surviving
      `dinner_ingredients` rows — and points to intent `013`.
- [ ] **Given** `010`'s FR-13, **When** amended, **Then** it is marked **superseded** by `013`
      FR-5, with a one-line reason: the section was scoped to a population that is empty by
      construction.
- [ ] **Given** both amendments, **When** read, **Then** they **correct the record, not rewrite
      history** — `010`'s original text stays legible, with the correction alongside it.
- [ ] **Given** `010`'s deployment plan, **When** this intent's work is planned, **Then** its
      POST-DEPLOY FINDING section links to intent `013`.
- [ ] **Given** the decision index, **When** updated, **Then** it records why `unassigned`
      turned out to be unreachable, so the reasoning is findable without reading two intents.

## Technical Notes

- Documentation only. No code, no schema.
- The point is not tidiness. `010` FR-6 currently asserts `unassigned` is _"a normal state, not
  an error, everywhere it appears"_, which is what led bolt 053 to build a section around an
  empty set. Leaving it uncorrected invites the same mistake.

## Dependencies

### Requires

- None

### Enables

- None — but should land with this unit so the record is right before unit 002 builds on it

## Out of Scope

- Changing `item_location_resolution`. The view is correct; the requirement describing it was not
