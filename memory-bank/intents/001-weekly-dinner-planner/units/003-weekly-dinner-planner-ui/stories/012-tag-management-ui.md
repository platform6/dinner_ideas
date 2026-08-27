---
id: 012-tag-management-ui
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-27T01:00:00Z'
assigned_bolt: 012-weekly-dinner-planner-ui
implemented: true
---

# Story: 012-tag-management-ui

## User Story

**As a** wife curating the catalog
**I want** to add or remove tags on a dinner from its card, and filter the catalog by tag
**So that** I can organize dinners my own way instead of relying on a fixed "Rosie-approved" flag

## Acceptance Criteria

- [ ] **Given** a card's expanded details section, **When** I view it, **Then** its current tags are listed alongside a "+" control
- [ ] **Given** the "+" control, **When** I type a new tag name and confirm, **Then** it's added to the dinner (saved immediately, no separate "save" step)
- [ ] **Given** a tag already on the dinner, **When** I remove it, **Then** it disappears from that dinner's list immediately
- [ ] **Given** the old "Rosie-approved" badge and "Rosie-approved only" filter checkbox, **When** this ships, **Then** both are removed from `DinnerCard.tsx` / `CatalogFilters.tsx`
- [ ] **Given** at least one tag exists in the catalog, **When** I open Catalog Filters, **Then** I can filter by selecting one or more tags

## Technical Notes

- Replaces `dinner.rosie_approved` usage in `DinnerCard.tsx` (badge) and `CatalogFilters.tsx`/`filters.ts` (`rosieApprovedOnly`) with the new tags data from `004-generic-tags-schema`.
- Tag add/remove should follow the existing mutation pattern in this codebase (`useMutation` + `invalidateQueries`, per `hooks.ts` conventions elsewhere in the app).
- Client-side normalization to lowercase before sending isn't required for correctness (the schema story enforces it server-side) but doing it client-side too avoids a round-trip surprising the user with a re-cased tag.

## Dependencies

### Requires

- `004-generic-tags-schema` (unit 001)
- `011-catalog-card-expandable-details` (same expanded section hosts both)

### Enables

- Full FR-9 experience

## Edge Cases

| Scenario                                                                    | Expected Behavior                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Adding a tag that already exists on that same dinner                        | No duplicate — either silently no-ops or the "+" input is disabled for tags already present |
| Filtering by a tag, then that tag gets removed from all dinners mid-session | Filter option and results update on next data refetch (standard react-query invalidation)   |

## Out of Scope

- Tag schema itself (→ `004-generic-tags-schema`)
- Steps/ingredients display (→ `011-catalog-card-expandable-details`)
