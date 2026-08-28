---
stage: implement
bolt: 024-frontend-review-ui
created: 2026-08-28T19:10:00Z
---

## Implementation Walkthrough: frontend-review-ui — bolt 024 (cuisine multi-select + filter-chip affordance)

### Summary

`CatalogFilterState.cuisine` moved from `string | null` to `string[]`; cuisine filtering in
`filters.ts` is now OR across the selected list, structurally identical to tag filtering. Active
filter chips (cuisine and tag) render through one `FilterChip` component where the label is plain
text and only a trailing Lucide `X` button removes the filter.

### Structure Overview

`cuisine` and `tags` are now the same shape, so the catalog filter row uses a single `FilterChip`
for both. The dropdown `CheckboxGroup` for cuisine keeps every ticked value instead of collapsing
to the last one.

### Completed Work

- [x] `src/features/dinners/components/CatalogFilters.tsx` — `cuisine: string[]`; "All" active on
      empty array, clears to `[]`; cuisine `CheckboxGroup` binds `filters.cuisine` directly and passes
      `values as string[]`; new local `FilterChip` (non-button `HStack` + `IconButton` with
      `uiIcons.remove`, `aria-label="Remove <label> filter"`) used for both cuisine and tag chips
- [x] `src/features/dinners/filters.ts` — `filters.cuisine.length > 0` → `filters.cuisine.includes(dinner.cuisine_type)`; doc comment updated
- [x] `src/features/dinners/components/CatalogPage.tsx` — `defaultFilters.cuisine: []`
- [x] `src/features/dinners/filters.test.ts` — array shape; added a multi-cuisine OR test
- [x] `src/features/dinners/components/CatalogFilters.test.tsx` — array shape; added a
      multi-select "keeps every ticked cuisine" test; chip-clear tests target the `Remove <label>
filter` button and assert the label is not itself a button

### Key Decisions

- **One `FilterChip` for cuisine and tags** — they are now identical in shape, and the review's
  polish 10 applies equally to both.
- **Icon is `uiIcons.remove`** (Lucide `X`). Story `009` text says `uiIcons.x`; the actual export
  key in `icons.tsx` is `remove` — same glyph.
- **Chip container is a non-interactive `HStack as="span"`** — nesting a button in a button is
  invalid HTML; only the inner `IconButton` is focusable.

### Deviations from Plan

None.

### Dependencies Added

None (imported `HStack`, `IconButton`, `Text` from `@chakra-ui/react`, already a dependency).

### Verification Run (this stage)

- [x] `npm run build` (`tsc -b && vite build`) — clean
- [x] `npm run lint` — clean
- [x] `npm run test` — 134 / 134 (was 132; +2 new tests)

### Developer Notes

The `IconButton` inside the chip uses `variant="unstyled"` with an explicit 24px box and a
`whiteAlpha.300` hover — small on purpose, but it still receives the global olive focus ring from
bolt `023`.
