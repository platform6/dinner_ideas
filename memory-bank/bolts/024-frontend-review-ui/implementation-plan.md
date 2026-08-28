---
stage: plan
bolt: 024-frontend-review-ui
created: 2026-08-28T19:05:00Z
---

## Implementation Plan: frontend-review-ui — bolt 024 (cuisine multi-select + filter-chip affordance)

### Objective

Make the catalog cuisine filter genuinely multi-select (mirroring `filters.tags`) and give each
active-filter chip a real remove button with its own hit area, using the Lucide `X` glyph
(`uiIcons.remove`) instead of a text `✕`.

### Stories

- **007-cuisine-filter-multi-select** (Should)
- **009-filter-chip-remove-affordance** (Could)

### Deliverables

**`src/features/dinners/components/CatalogFilters.tsx`**

- `CatalogFilterState.cuisine`: `string | null` → `string[]`
- "All" button: active when `filters.cuisine.length === 0`; clears to `cuisine: []`
- Active-cuisine chips: map over `filters.cuisine` (like tags), one chip per cuisine, each removing
  only itself
- Cuisine `CheckboxGroup`: `value={filters.cuisine}`, `onChange={(v) => onChange({ ...filters, cuisine: v as string[] })}`
  (drop the `values[values.length - 1]` last-wins line)
- New local `FilterChip` component used for **both** cuisine and tag chips: an olive-filled
  `HStack` (not a button) holding the label text + an `IconButton` with `icon={<uiIcons.remove …>}`,
  `aria-label={`Remove ${label} filter`}`, its own padded hit area

**`src/features/dinners/filters.ts`**

- `if (filters.cuisine.length > 0) { result = result.filter((d) => filters.cuisine.includes(d.cuisine_type)); }`
- Update the doc comment: cuisine filtering is now OR across the selected list, same as tags

**`src/features/dinners/components/CatalogPage.tsx`**

- `defaultFilters.cuisine`: `null` → `[]`

**Tests**

- `src/features/dinners/filters.test.ts` — `noFilters.cuisine: []`; the three `cuisine: 'X'`
  literals → `cuisine: ['X']`
- `src/features/dinners/components/CatalogFilters.test.tsx` — `baseFilters.cuisine: []`; cuisine
  `onChange` expectation → `cuisine: ['Mexican']`; the two chip-clear tests target the new
  `Remove <label> filter` button and expect `cuisine: []` / `tags: []`

### Dependencies

- Bolt `023` (complete) — the Cuisine/Tags dropdown `Menu` and `uiIcons.remove` are themed there.
- `CatalogPage.test.tsx` has no `cuisine`-shape assertions (only renders "no dinners match") — no
  change needed there.

### Technical Approach

- `cuisine` and `tags` become structurally identical (`string[]`, OR, chip-per-value) — the chip
  rendering and removal handlers collapse to one `FilterChip` used twice.
- Nesting a `<button>` in a `<button>` is invalid — the chip container is a non-interactive
  `HStack`; only the inner `IconButton` is focusable/clickable.
- Icon is Lucide `X`, exported as `uiIcons.remove` (story text says `uiIcons.x` — same glyph,
  the actual export key is `remove`).

### Acceptance Criteria

- [ ] `CatalogFilterState.cuisine` is `string[]`; `CatalogPage` seeds `[]`
- [ ] `filters.ts` cuisine match is OR; empty array = no cuisine filter
- [ ] Ticking two cuisines shows dinners of either; unticking one leaves the other; "All" clears to `[]`
- [ ] Each active-filter chip: label is not a button; a distinct `uiIcons.remove` button removes only that filter
- [ ] Chip treatment identical for cuisine and tag chips
- [ ] `filters.test.ts` + `CatalogFilters.test.tsx` updated to the array shape, all green
- [ ] `npx tsc -b`, `eslint`, `vite build` clean; full `vitest run` green

### Out of Scope

- Persisting filter state (none exists)
- The dropdown menus' own styling (bolt `023`)
- Shopping-list bar / card layerStyles (bolt `025`)
