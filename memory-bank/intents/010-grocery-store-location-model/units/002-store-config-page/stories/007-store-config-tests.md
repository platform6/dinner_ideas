---
id: 007-store-config-tests
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: complete
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 053-store-config-page
implemented: true
---

# Story: 007-store-config-tests

## User Story

**As a** developer maintaining the store-config page
**I want** the whole walking-path flow covered by tests
**So that** a future change can't silently break placement, suggestions, or the destructive
confirm

## Acceptance Criteria

- [ ] **Given** `similarity.test.ts`, **When** run, **Then** it covers: normalization, the
      false-friend families named in `requirements.md` FR-7, rarer-token weighting, the
      category tiebreaker never carrying a match alone, dismissal exclusion, and the
      above/below-cutoff boundary.
- [ ] **Given** `StoreConfigPage.test.tsx` (reworked), **When** run, **Then** it covers: the
      unified list renders sections and aisles as peers; add/rename/remove; reorder calls
      `reorder_location`; the destructive confirm shows the right count and only for a
      non-empty Location; first-run and desktop states.
- [ ] **Given** `AssignSheet.test.tsx` (new), **When** run, **Then** it covers: the
      resolution line for all three states; a suggestion accept writes the placement; a
      dismiss writes a `suggestion_dismissals` row and hides that pairing on reopen; "Take it
      off the path" removes an explicit placement; focus trap + `Escape` + focus return.
- [ ] **Given** `UnassignedSection.test.tsx` (new), **When** run, **Then** it covers: default
      scope vs. full-catalog search; both empty states; "Place" opens the assign flow.
- [ ] **Given** the existing `store-config` suite, **When** run, **Then** it is fully
      reworked (not just extended) — the old `GroceryStoreRow`/`CategoryRowAssignment` shapes
      are gone from the tests along with the code.

## Technical Notes

- Mock Supabase at the boundary per this project's coding standards; don't mock the
  similarity algorithm itself when testing the assign flow — test it for real with small
  fixtures.

## Dependencies

### Requires

- 001-similarity-algorithm
- 002-walking-path-list
- 003-assign-flow
- 004-unassigned-section
- 005-first-run-and-desktop
- 006-delete-location-confirm

### Enables

- None (last story of the unit)

## Edge Cases

_Covered by the acceptance criteria above — this story is itself the edge-case net for the
unit._

## Out of Scope

- End-to-end / browser tests
- Unit 1's pgTAP coverage (its own story) and unit 3's tests (its own story)
