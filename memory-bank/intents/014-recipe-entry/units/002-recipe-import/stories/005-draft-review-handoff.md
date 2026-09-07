---
id: 005-draft-review-handoff
unit: 002-recipe-import
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 062-import-review-and-tests
implemented: false
---

# Story: 005-draft-review-handoff

## User Story

**As a** household member who just imported a recipe
**I want** to check and fix it before it goes in
**So that** an extraction mistake never lands in the catalog behind my back

## Acceptance Criteria

- [ ] **Given** a successful extraction, **When** it completes, **Then** the user lands on the same
      editable form manual entry uses, pre-filled with the draft.
- [ ] **Given** the pre-filled form, **When** reviewed, **Then** every field is correctable —
      including each ingredient line and each cooking step, which can also be reordered, added to
      and removed.
- [ ] **Given** a reviewed draft, **When** saved, **Then** it goes through unit 001's save path.
      This unit writes nothing itself.
- [ ] **Given** a draft, **When** the user leaves the page, **Then** nothing is written.
- [ ] **Given** a draft whose quantities were not rescaled because the source gave no serving
      count, **When** reviewed, **Then** the form says so where the user will see it.

## Technical Notes

- The structural guarantee behind FR-7: this unit produces a draft and has no save of its own to
  call. Review cannot be skipped because there is no path that skips it.
- The handoff is one direction only. The form does not know or care whether its contents were typed
  or extracted, which is what keeps unit 001 independent of unit 002.

## Dependencies

### Requires

- 003-response-parsing
- Unit 001's form and save

### Enables

- None

## Out of Scope

- A separate "import preview" screen — the review surface is the entry form, deliberately
