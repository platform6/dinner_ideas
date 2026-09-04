---
id: 004-unassigned-section
unit: 002-store-config-page
intent: 010-grocery-store-location-model
status: draft
priority: must
created: '2026-09-04T14:30:00Z'
assigned_bolt: 053-store-config-page
implemented: false
---

# Story: 004-unassigned-section

## User Story

**As a** household member who hasn't placed every ingredient
**I want** a calm, findable home for the ones I haven't gotten to
**So that** "not placed yet" reads as normal, not as something broken

## Acceptance Criteria

- [ ] **Given** the page, **When** it renders, **Then** a collapsed "Not on the path yet"
      section sits below the walking path in the same column, with a count and a subtitle
      stating the consequence ("4 groceries sort to the end") — not the condition.
- [ ] **Given** the default scope, **When** the section is collapsed or freshly expanded,
      **Then** it populates from Items used in **at least one recipe** — not the full
      registry.
- [ ] **Given** the section expanded, **When** a search field is used, **Then** it reaches
      the **full** Items catalog beyond the default scope, placeholder "Search all
      groceries".
- [ ] **Given** a result, **When** shown, **Then** it displays the item name, its category,
      and a "Place" action opening the assign flow (story 003).
- [ ] **Given** no search term, **When** the section is empty of unassigned items, **Then**
      it reads "Everything has a spot on the path." Given a term matching nothing, it quotes
      the term back. Both neutral — no red/warning styling anywhere in this section.

## Technical Notes

- New `src/features/store-config/components/UnassignedSection.tsx`.
- "Used in at least one recipe" = referenced by an active dinner's `dinner_ingredients`;
  matches `storeconfig.md`'s stated default scope exactly.

## Dependencies

### Requires

- 003-assign-flow

### Enables

- 007-store-config-tests

## Edge Cases

| Scenario                                                                  | Expected Behavior                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| An item is placed from this section                                       | It moves out of the unassigned list on the next render (resolution query re-fetch) |
| A brand-new household with no recipes yet                                 | Empty state: "Everything has a spot on the path." (vacuously true)                 |
| Search term matches an item outside the default scope (used in 0 recipes) | Still shown — search reaches the full catalog per spec                             |

## Out of Scope

- The assign flow itself (story 003)
- Any bulk-placement action
