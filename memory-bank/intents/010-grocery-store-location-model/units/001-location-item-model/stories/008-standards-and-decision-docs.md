---
id: 008-standards-and-decision-docs
unit: 001-location-item-model
intent: 010-grocery-store-location-model
status: complete
priority: should
created: '2026-09-04T14:30:00Z'
assigned_bolt: 051-location-item-model
implemented: true
---

# Story: 008-standards-and-decision-docs

## User Story

**As a** developer returning to this codebase later
**I want** the model change recorded in the standards docs
**So that** the next person (or intent) understands the Store/Location/Item model without
re-deriving it from migrations

## Acceptance Criteria

- [ ] **Given** `standards/system-architecture.md` and `standards/data-stack.md`, **When**
      updated, **Then** the category→row description is replaced with the
      Store/Location/Item model, including a note on the Items registry and its
      trigger-based sync.
- [ ] **Given** `standards/decision-index.md`, **When** updated, **Then** it gets an entry
      for "grocery store config moves from broad-category→row mapping to
      individual-ingredient→Location with category fallback, a multi-store-ready schema, and
      a similarity-suggestion assist" — including the Resolved Decisions from
      `requirements.md` (registry dedup key, cascade-delete semantics, reorder reuse,
      client-side similarity).
- [ ] **Given** `001-weekly-dinner-planner` unit `004-grocery-store-config`'s brief, **When**
      updated, **Then** it gets a "superseded by `010`" note.

## Technical Notes

- Follow the existing decision-index entry format (see the entries for intents `004`, `007`,
  `008`).

## Dependencies

### Requires

- 007-cutover-migration (the model must be final before documenting it)

### Enables

- None (last story of the unit)

## Edge Cases

_None — documentation only._

## Out of Scope

- Any code change
