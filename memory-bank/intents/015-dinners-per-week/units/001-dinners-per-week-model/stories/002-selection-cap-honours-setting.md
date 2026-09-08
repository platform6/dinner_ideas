---
id: 002-selection-cap-honours-setting
unit: 001-dinners-per-week-model
intent: 015-dinners-per-week
status: complete
priority: must
created: '2026-09-07T04:00:00Z'
assigned_bolt: 063-dinners-per-week-rule
implemented: true
---

# Story: 002-selection-cap-honours-setting

## User Story

**As a** household member picking dinners
**I want** the app to stop me at our number, not at three
**So that** the setting is a real rule rather than a decoration

## Acceptance Criteria

- [ ] **Given** a household set to N, **When** selection N is added, **Then** it is accepted.
- [ ] **Given** the same household, **When** selection N+1 is added, **Then** it is rejected.
- [ ] **Given** the rejection, **When** its message is read, **Then** it states the actual limit —
      not the literal "3" the current message hard-codes.
- [ ] **Given** two concurrent inserts on a plan at N-1 selections, **When** both run, **Then**
      exactly one succeeds. **This is the specific bug `20260827002830` was written to fix** and it
      must not regress.
- [ ] **Given** the trigger, **When** it reads the limit, **Then** it reads from the **plan's**
      household, not from the caller's session.

## Technical Notes

The existing function takes `for update` on the plan row before counting, which is what serialises
concurrent writers. **Keep that, and keep it on the plan row.**

Reading `dinners_per_week` adds a second lookup but does not need its own lock: a setting change
running concurrently with a pick is not a correctness problem. Whichever value the transaction
sees, the invariant it must uphold — "no more than that many selections at commit" — still holds.

Write that reasoning into the migration. The next person to touch this will have the same question,
and the concurrency fix's own header comment is the precedent for explaining it in place.

## Dependencies

### Requires

- 001-dinners-per-week-column

### Enables

- 004-rule-tests

## Edge Cases

| Scenario                                          | Expected Behavior                                     |
| ------------------------------------------------- | ----------------------------------------------------- |
| Setting lowered below the current selection count | Nothing is deleted; the extra picks remain (FR-5)     |
| A plan belonging to another household             | Reads that plan's household setting, not the caller's |

## Out of Scope

- Client-side gating (unit 002) — this is the enforcement, not the affordance
