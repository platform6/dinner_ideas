---
id: 003-removal-tests
unit: 003-remove-a-dinner
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T16:24:16Z'
assigned_bolt: null
implemented: false
---

# Story: 003-removal-tests

## User Story

**As a** future maintainer
**I want** the delete path tested where it can silently corrupt data
**So that** a schema change does not start leaving orphans

## Acceptance Criteria

- [ ] **Given** pgTAP, **When** run, **Then** a removal deletes all four row types and leaves no
      orphans
- [ ] **Given** pgTAP, **When** run, **Then** the shared tag vocabulary survives a removal
- [ ] **Given** pgTAP, **When** run, **Then** another household's dinner cannot be removed
- [ ] **Given** the UI, **When** tested, **Then** removal requires confirmation and a dinner with
      history shows its warning

## Technical Notes

- `create_dinner_rpc_test.sql` is the precedent for testing the aggregate write; this is its mirror
