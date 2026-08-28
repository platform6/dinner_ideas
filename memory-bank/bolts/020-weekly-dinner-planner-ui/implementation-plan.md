---
stage: plan
bolt: 020-weekly-dinner-planner-ui
created: 2026-08-28T00:35:00Z
---

## Implementation Plan: weekly-dinner-planner-ui (bolt 020)

### Objective

Restructure the catalog filter row so cuisine and tag filtering are visibly separate,
self-describing controls: split the tag multi-select out of the shared overflow menu into
its own "Tags" dropdown, and rename the remaining "More" menu to "Cuisine". Presentation
only — no change to filter state shape or matching logic.

### Stories in Scope

1. **015-standalone-tag-filter-dropdown** (FR-13, Must) — tag multi-select moves to its own "Tags" dropdown next to the cuisine dropdown.
2. **016-rename-filter-menu-cuisine** (FR-14, Must) — "More" `MenuButton` text + `aria-label` become "Cuisine"; that menu holds only the cuisine list.

### Deliverables

- `src/features/dinners/components/CatalogFilters.tsx` — refactored into two sibling `Menu`s:
  - **"Cuisine"** menu: the existing cuisine `CheckboxGroup` only. Button label `Cuisine`, `aria-label="Cuisine"`. Rendered when `cuisines.length > 0`.
  - **"Tags"** menu: the existing `availableTags` `CheckboxGroup` only. Button label `Tags`, `aria-label="Tags"`. Rendered when `availableTags.length > 0`.
  - Each menu owns its own open/close state (replace the single `isOverflowOpen` with one per menu, or a small `useDisclosure` each).
  - Active cuisine chip and active tag chips continue to render exactly as today.
- `src/features/dinners/components/CatalogFilters.test.tsx` — **new** focused component test (Stage 3): asserts the "Cuisine" and "Tags" buttons exist, each lists the right options, selecting drives `onChange` with the right `CatalogFilterState`, and chips clear on click.
- `src/features/dinners/components/CatalogPage.test.tsx` — update any assertion that referenced the old "More" / "More filters" strings (none currently do; verify during Implement).

### Dependencies

- None blocking. `CatalogFilterState`, `filters.ts`, `useAllTags`, and `CatalogPage` wiring are all already in place from bolt `012-weekly-dinner-planner-ui`. No new npm packages.
- Chakra UI `Menu`, `MenuButton`, `MenuList`, `CheckboxGroup`, `Checkbox`, `Wrap`, `Button` — all already imported/used in this file.

### Technical Approach

1. In `CatalogFilters.tsx`, delete the single combined `Menu` block. Add two `Menu` blocks in its place, each a copy of the current `MenuButton`/`MenuList` shell wrapping one `CheckboxGroup`.
2. Cuisine menu: keep the current `value`/`onChange` logic (`values[values.length - 1]` single-select semantics) and the `mb` spacing can drop since it no longer sits above a tags group.
3. Tags menu: keep `value={filters.tags}` / `onChange={(tags) => onChange({ ...filters, tags: tags as string[] })}`.
4. State: replace `const [isOverflowOpen, setIsOverflowOpen]` with `const cuisineMenu = useDisclosure()` and `const tagMenu = useDisclosure()` (import `useDisclosure` from `@chakra-ui/react`), wiring `isOpen`/`onOpen`/`onClose` on each `Menu`. (If the menus work fine uncontrolled, drop the disclosure entirely — decide during Implement; simplest wins.)
5. Icons: cuisine menu keeps `uiIcons.filters` or switches to a cuisine-flavoured icon from `icons.tsx` if one reads better (cosmetic); tags menu uses a tag icon from `icons.tsx` if available, else `uiIcons.filters`.
6. Leave the always-inline "All" and "Quickest" buttons and the chip rendering untouched.
7. Run `npx prettier`/`eslint` per coding-standards (2-space, single-quote, semicolons).

### Acceptance Criteria

- [ ] A "Tags" dropdown button renders next to the cuisine dropdown when the tag vocabulary is non-empty; hidden when empty.
- [ ] The "Tags" dropdown lists the full `availableTags` vocabulary as multi-select checkboxes; toggling updates results immediately with OR semantics; selected tags show as `tag ✕` chips that clear on click.
- [ ] The cuisine dropdown button reads "Cuisine" (was "More") with a matching `aria-label` (was "More filters"), and contains only cuisine checkboxes — no tags.
- [ ] "All" and "Quickest" inline controls unchanged in label and behaviour.
- [ ] `CatalogFilterState` and `filters.ts` are unmodified.
- [ ] `npx tsc -b`, `eslint`, `vite build`, and `vitest` all clean; new `CatalogFilters.test.tsx` covers the two dropdowns.

### Out of Scope

- Tag add/remove/rename on a dinner (FR-9, already built).
- Any change to tag storage, normalization, `filters.ts`, or OR→AND semantics.
- Renaming "cuisine" anywhere outside this filter control.
