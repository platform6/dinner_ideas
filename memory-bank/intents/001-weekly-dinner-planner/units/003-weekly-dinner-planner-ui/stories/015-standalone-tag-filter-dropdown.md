---
id: 015-standalone-tag-filter-dropdown
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 020-weekly-dinner-planner-ui
implemented: true
---

# Story: 015-standalone-tag-filter-dropdown

## User Story

**As a** household member filtering the dinner catalog
**I want** the tag filter to be its own dropdown next to the cuisine filter
**So that** I can tell cuisine and tag filtering apart at a glance instead of hunting for tags inside a single "More" menu

## Acceptance Criteria

- [ ] **Given** the catalog has at least one tag in the vocabulary, **When** I view the filter row, **Then** I see a dropdown button labelled "Tags" sitting next to the cuisine dropdown (FR-14).
- [ ] **Given** the "Tags" dropdown is open, **When** it renders, **Then** it lists the full tag vocabulary from `useAllTags` (not only tags on currently-visible dinners), each as a multi-select checkbox.
- [ ] **Given** I check one or more tags, **When** the selection changes, **Then** the catalog immediately filters to dinners matching _any_ selected tag (OR semantics, unchanged from today) and each selected tag appears as a removable `tag ✕` chip in the filter row.
- [ ] **Given** a `tag ✕` chip is shown, **When** I click it, **Then** that tag is removed from the filter and results update.
- [ ] **Given** the tag vocabulary is empty, **When** I view the filter row, **Then** the "Tags" dropdown is not rendered.
- [ ] **Given** the cuisine dropdown (FR-14), **When** it renders, **Then** it contains only cuisine checkboxes and no tag checkboxes.

## Technical Notes

- Single file: `src/features/dinners/components/CatalogFilters.tsx`. Split the second `CheckboxGroup` (the `availableTags` one, currently lines ~99-112) out of the shared `MenuList` into its own `Menu`/`MenuButton`/`MenuList`.
- `CatalogFilterState` is unchanged — `tags: string[]` already exists and carries the same semantics.
- Reuse the existing overflow-menu open/close state pattern; give the new menu its own `isOpen` state (or a small `useDisclosure` per menu).
- Filtering logic in `filters.ts` is untouched — this is presentation only.
- Update/extend `CatalogFilters` tests (there is coverage via `CatalogPage.test.tsx`) to assert the "Tags" button exists and drives the same filter behaviour.

## Dependencies

### Requires

- None (the tag filter and `useAllTags` already exist from bolt `012-weekly-dinner-planner-ui`)

### Enables

- None

## Edge Cases

| Scenario                                     | Expected Behavior                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Only cuisines exist, zero tags               | "Tags" dropdown hidden; cuisine dropdown still shown                                  |
| Only tags exist, zero cuisines               | "Tags" dropdown shown; cuisine dropdown hidden (existing conditional)                 |
| Many tags (20+)                              | Dropdown list scrolls within the `MenuList`; filter row stays single-purpose          |
| Same label text collides with a cuisine name | No special handling needed — they are independent filters on independent state fields |

## Out of Scope

- Adding/removing/renaming tags on a dinner (that is FR-9 / story `012-tag-management-ui`, already built)
- Any change to tag storage, normalization, or the `filters.ts` matching logic
- Changing OR semantics to AND
