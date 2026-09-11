---
id: 001-remove-a-dinner
unit: 003-remove-a-dinner
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T18:25:00Z'
assigned_bolt: null
implemented: false
---

# Story: 001-remove-a-dinner

## User Story

**As a** household member who imported something wrong
**I want** to remove it from the catalog
**So that** a mistake does not sit in the list forever

## Acceptance Criteria

- [ ] **Given** a dinner, **When** removed, **Then** the dinner, its ingredients, its steps and its
      tag links are all deleted
- [ ] **Given** a removal, **When** it runs, **Then** it is atomic — no orphaned children on any
      failure path (NFR-3)
- [ ] **Given** a removal, **When** complete, **Then** the name is reusable, so a corrected version
      can be imported under the same name
- [ ] **Given** a removal, **When** it runs, **Then** household RLS applies — a member cannot remove
      another household's dinner

## Technical Notes

- `on delete cascade` versus an RPC is the design decision; the requirement is atomicity, not a
  mechanism
- The tags themselves are a shared household vocabulary and must NOT be deleted — only the links
