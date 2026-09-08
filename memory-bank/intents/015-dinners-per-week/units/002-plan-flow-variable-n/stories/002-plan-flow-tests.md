---
id: 002-plan-flow-tests
unit: 002-plan-flow-variable-n
intent: 015-dinners-per-week
status: planned
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 065-plan-flow-variable-n
implemented: false
---

# Story: 002-plan-flow-tests

## User Story

**As a** future maintainer
**I want** these screens tested at a number other than three
**So that** "works at 3" is never mistaken for "honours the setting"

## Acceptance Criteria

- [ ] **Given** a household at a **non-default** N, **When** each affected screen is tested,
      **Then** its gate, copy and hook enablement follow N.
- [ ] **Given** the existing tests for these screens, **When** this story lands, **Then** they pass
      — updated where they asserted the literal 3, and only there.
- [ ] **Given** the plan page at N-1 selections, **When** tested, **Then** the lock control is
      absent and the nudge names the right number.
- [ ] **Given** a household at the default, **When** tested, **Then** behaviour is identical to
      today — this change must be invisible to anyone who never opens settings.

## Technical Notes

- The last criterion is the important one. The intent's promise is that it is a no-op by default,
  and a test asserting that is what makes the promise checkable.

## Dependencies

### Requires

- 001-plan-flow-reads-setting

### Enables

- None

## Out of Scope

- pgTAP coverage of the rule itself (unit 001, story 004)
