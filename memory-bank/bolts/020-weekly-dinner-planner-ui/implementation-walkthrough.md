---
stage: implement
bolt: 020-weekly-dinner-planner-ui
created: 2026-08-28T01:05:00Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (bolt 020)

### Summary

The single combined "More" dropdown in the catalog filter row was split into two sibling
dropdowns — "Cuisine" and "Tags" — each wrapping the checkbox group it already owned. The
cuisine dropdown replaces the old "More" button (label and accessible name both now
"Cuisine"). No filter state, matching logic, or chip behaviour changed.

### Structure Overview

`CatalogFilters` still renders one `Wrap` row: the always-inline "All" and "Quickest"
buttons, then the active cuisine chip and active tag chips, then — conditionally — a
"Cuisine" `Menu` (shown when `cuisines` is non-empty) and a "Tags" `Menu` (shown when
`availableTags` is non-empty). Each `Menu` is controlled by its own `useDisclosure`
instance, replacing the previous shared `useState` open flag. The tag vocabulary continues
to come from the `availableTags` prop (fed by `useAllTags` upstream), unchanged.

### Completed Work

- [x] `src/features/dinners/components/CatalogFilters.tsx` — split the combined menu into `Cuisine` + `Tags` dropdowns; renamed the cuisine `MenuButton` text and `aria-label` from "More" / "More filters" to "Cuisine"; swapped the single `isOverflowOpen` state for one `useDisclosure` per menu; updated the component doc comment to describe both dropdowns (FR-13, FR-14).
- [x] `src/shared/components/icons.tsx` — added `Tag` (lucide-react) as `uiIcons.tag`, used as the "Tags" dropdown's `leftIcon`; the "Cuisine" dropdown reuses the existing `uiIcons.allCuisines`.

### Key Decisions

- **One `useDisclosure` per menu**: keeps parity with the original controlled-menu approach (open/close wired explicitly) while letting the two menus open independently; simpler than threading two `useState` pairs by hand.
- **New `uiIcons.tag` entry rather than an ad-hoc import**: honours the icon-vocabulary rule in `icons.tsx` (one source of truth, no glyph defined twice).
- **`CatalogFilterState` untouched**: `tags: string[]` and `cuisine: string | null` already model exactly what the two dropdowns produce, so FR-13/14 are pure presentation — `filters.ts` was not opened.

### Deviations from Plan

None. The plan left "controlled vs. uncontrolled menu state" open; went with controlled (`useDisclosure`) as noted above.

### Dependencies Added

None. `useDisclosure` is part of `@chakra-ui/react`, already a dependency; `Tag` is from `lucide-react`, already a dependency.

### Developer Notes

- Chakra closes a `MenuList` only on `MenuItem` click; the checkboxes here are `Checkbox`es inside a `CheckboxGroup`, not `MenuItem`s, so multi-selecting tags keeps the "Tags" menu open — same behaviour the combined menu had.
- Gate run clean: `npx tsc -b`, `npx eslint`, `npx vitest run` (124/124), `npx vite build` all pass. The build's >500 kB chunk-size warning is pre-existing and unrelated.
- Component-level tests for the two dropdowns are added in Stage 3 (`CatalogFilters.test.tsx`, new).
