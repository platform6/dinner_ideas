---
id: 006-import-tests
unit: 002-recipe-import
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 062-import-review-and-tests
implemented: false
---

# Story: 006-import-tests

## User Story

**As a** future maintainer
**I want** the extraction boundary covered where it can silently produce something wrong
**So that** a prompt or parser change does not start quietly dropping cooking steps

## Acceptance Criteria

- [ ] **Given** the parser, **When** tested, **Then** cases cover: a well-formed response, a
      malformed one, a truncated one, one with ingredients but **no steps**, and a refusal
      returning 200 — each producing a failed extraction rather than a partial draft.
- [ ] **Given** sizing, **When** tested, **Then** cases assert an empty paste makes no API call,
      and an oversize paste is trimmed from the end with the request landing under the cap.
- [ ] **Given** each proxy error code, **When** tested, **Then** a case asserts its own distinct
      message and that the pasted text survives.
- [ ] **Given** a successful extraction, **When** tested, **Then** a case asserts the draft reaches
      the form with steps in order, and that no save occurred until an explicit save.
- [ ] **Given** the existing entry-page tests from unit 001, **When** this unit lands, **Then**
      they pass **unmodified** — the import path is additive to a page that already worked.

## Technical Notes

- The prompt's output quality cannot be unit-tested — it depends on a live model. What _can_ be
  tested is everything around it: sizing, parsing, failure classification, and the handoff. Test
  those thoroughly and do not write a test that pretends to verify extraction quality.
- Judging whether steps survive real recipes is a manual check against real pasted pages, and
  belongs in the bolt's test report as manual — it is also the evidence for this unit's cut
  criterion.

## Dependencies

### Requires

- 004-proxy-error-messages
- 005-draft-review-handoff

### Enables

- None

## Out of Scope

- Testing `claude-proxy` itself — it has its own suite from intents 007 and 008
