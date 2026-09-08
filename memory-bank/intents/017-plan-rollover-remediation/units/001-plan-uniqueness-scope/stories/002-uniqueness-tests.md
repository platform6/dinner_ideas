---
id: 002-uniqueness-tests
unit: 001-plan-uniqueness-scope
intent: 017-plan-rollover-remediation
status: complete
priority: must
created: '2026-09-08T00:00:00Z'
assigned_bolt: 067-plan-uniqueness-scope
implemented: true
---

# Story: 002-uniqueness-tests

## User Story

**As a** future maintainer
**I want** the suite to assert the rule that should hold, not the one that caused an outage
**So that** the next person to read these tests is not misled the way this bug was missed

## Acceptance Criteria

- [ ] **Given** `weekly_planning_test.sql`'s case `'a second unlocked weekly plan is rejected
  while one already exists'`, **When** this story lands, **Then** it is **rewritten** to
      assert rejection for the **same week** — not deleted.
- [ ] **Given** the new rule, **When** tested, **Then** a case asserts a plan for a **different**
      week is accepted while an unlocked draft exists.
- [ ] **Given** the production scenario, **When** tested, **Then** a case reproduces it directly:
      an unlocked plan for an earlier week, then a successful create for the current week.
- [ ] **Given** `weekly_planning_meal_history_test.sql`, **When** this story lands, **Then** its
      comments about working around the live project's unlocked plan are corrected — the
      workaround is no longer needed, and a comment describing a vanished constraint misleads.
- [ ] **Given** the whole suite, **When** searched, **Then** nothing still asserts
      one-unlocked-plan-per-household-globally.

## Technical Notes

**Deleting the failing assertion is the wrong fix and the easy one.** It would go green while
proving nothing. The protection bolt 027 added is still wanted; only its scope changes.

The comment in the meal-history suite —

> Safe against a fresh local/CI database ... unlike the live project

— is the trace of this bug being seen a release cycle early and read as a CI inconvenience. Worth
correcting carefully rather than deleting, so the next reader understands what changed.

## Dependencies

### Requires

- 001-scope-index-to-week

### Enables

- None

## Out of Scope

- Component tests for the message (unit 002)
