---
stage: plan
bolt: 019-kitchen-table-ui
created: 2026-08-27T14:30:00Z
---

## Implementation Plan: kitchen-table-ui (Store Config restyle)

### Objective

Restyle `StoreConfigPage.tsx` per story `012` — the one screen with no pixel reference in the
handoff (it postdates it), extrapolated from the conventions established across bolts 014–018.
Lowest-priority (`Should`) story in the intent.

### Deliverables

- `StoreConfigPage.tsx`: page title restyled to `pageTitle`; section headings become
  `sectionLabel` ("Rows", "Category assignments"); each row becomes a `layerStyle="card"` row
  with a neutral 30px numbered tile (position), matching the card/list-row convention used
  elsewhere (This Week's numbered rows, DinnerCard, etc.); up/down become outline `IconButton`s
  with new icon-vocabulary entries `uiIcons.rowUp`/`rowDown` (`ArrowUp`/`ArrowDown`); delete
  becomes an icon-only `quiet`-variant `IconButton` with a new `uiIcons.deleteRow` (`Trash2`);
  the add-row `Input` already uses the theme's default `filled` variant (`001-design-token-
foundation`), so it just drops its own inline styling to inherit it cleanly; the category-
  assignment `Select` already defaults to the theme's `outline` variant override, same
  treatment. No-rows-yet message moves into a `cardDashed` box, copy unchanged.

### Dependencies

- `001-design-token-foundation`, `002-icon-vocabulary` (bolt `014`, complete)

### Technical Approach

- `useRows`/`useReorderRow`/`useAddRow`/`useDeleteRow`/`useAssignCategory` are completely
  unchanged — presentation-only, same as every other story in this unit.
- The existing test file's contracts (`aria-label="Move X up/down"`, generic `aria-label="Delete"`
  exact match, `"New row name"`/`"Add row"`/`"Row for {category}"` labels) all survive the
  restyle unchanged — converting the visible-text "Delete" `Button` to an icon-only `IconButton`
  keeps the same `aria-label="Delete"` contract the test already asserts on.

### Acceptance Criteria

Directly from story `012` (see it for the full Given/When/Then list); summarized:

- [ ] Row list uses the same card/list-row convention as other screens
- [ ] Up/down/delete controls use icons from the extended store-config icon-vocabulary entries
- [ ] Add-row input matches the filled-input convention
- [ ] Category-assignment selects match the theme's `Select` override
- [ ] `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
