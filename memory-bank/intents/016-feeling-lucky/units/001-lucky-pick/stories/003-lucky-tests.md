---
id: 003-lucky-tests
unit: 001-lucky-pick
intent: 016-feeling-lucky
status: complete
priority: must
created: '2026-09-07T04:10:00Z'
assigned_bolt: 066-lucky-pick
implemented: true
---

# Story: 003-lucky-tests

## User Story

**As a** future maintainer
**I want** the draw's fairness and its exclusions actually tested
**So that** "it looked random when I tried it" is not the evidence

## Acceptance Criteria

- [ ] **Given** a seeded random source, **When** the draw is tested, **Then** cases assert that a
      recently-eaten dinner is chosen less often than a long-ago one across many draws — the bias
      is measured, not assumed.
- [ ] **Given** a seeded source, **When** tested, **Then** a case asserts that different sources
      give different results, proving it is a draw rather than a ranking.
- [ ] **Given** never-eaten dinners, **When** tested, **Then** a case asserts they are eligible and
      not penalised.
- [ ] **Given** suppressed and already-picked dinners, **When** tested, **Then** cases assert
      neither is ever returned.
- [ ] **Given** a pool smaller than the number of slots, **When** tested, **Then** a case asserts a
      partial fill plus the ran-out message.
- [ ] **Given** a household at a **non-default** `dinners_per_week`, **When** tested, **Then** a
      case asserts the right number of slots is filled.
- [ ] **Given** a locked or full week, **When** tested, **Then** cases assert the control is
      disabled with its reason visible.

## Technical Notes

- The seeded source is what makes the first two criteria possible at all; a component calling
  `Math.random()` inline cannot be tested for either property. That is why story 001 requires the
  draw to be pure with an injected source.
- Testing a weighted distribution means many draws and a tolerance, not one draw and an assertion.
  Keep the tolerance loose enough not to flake and tight enough to catch an unweighted draw.

## Dependencies

### Requires

- 002-lucky-control

### Enables

- None

## Out of Scope

- Testing the cap trigger — intent 015 owns that
