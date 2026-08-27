---
stage: implement
bolt: 019-kitchen-table-ui
completed: '2026-08-27T14:45:00Z'
---

## Implementation Walkthrough: kitchen-table-ui (Store Config restyle)

### What changed

`StoreConfigPage.tsx` rewritten:

- Title restyled to `textStyle="pageTitle"`; "Rows"/"Category assignments" headings become
  `textStyle="sectionLabel"`; descriptive copy under each moved to `textStyle="faint"`.
- Each row is now a `layerStyle="card"` row with a neutral 30px `paper.sunken`/`ink.500`
  numbered position tile, matching the numbered-row convention from `PlanPage`/`DinnerCard`.
- Up/down controls are outline `IconButton`s using two new icon-vocabulary entries,
  `uiIcons.rowUp` (`ArrowUp`) and `uiIcons.rowDown` (`ArrowDown`); delete is now an icon-only
  `quiet`-variant `IconButton` using a new `uiIcons.deleteRow` (`Trash2`) — same `aria-label`
  contracts as before (`"Move {name} up/down"`, exact `"Delete"`).
- Add-row `Input`/category `Select` drop their own `size="sm"` overrides to inherit the theme's
  `filled`/`outline` variant styling cleanly (both already defaulted to the right variant before
  this bolt — `001-design-token-foundation` and the `Select` override already applied).
- No-rows-yet message moved into a `layerStyle="cardDashed"` box, copy unchanged.
- `useRows`/`useReorderRow`/`useAddRow`/`useDeleteRow`/`useAssignCategory` untouched.

### Test impact

None — every existing `StoreConfigPage.test.tsx` assertion (`aria-label`s, `"Add row"` button
text, `"Row for {category}"` select labels) passed unchanged against the restyled markup. No
test file changes were needed for this bolt.

### Verification

- `npx tsc -b`, `npx eslint .`, `npx vitest run` (124/124 passing across 20 files — same count
  as bolt 018, since this bolt required no test changes), and `npx vite build` all pass clean.
- Not live-verified in browser — requires an authenticated session, same gap as every bolt since
  `015`.

### Acceptance criteria

- [x] Row list uses the same card/list-row convention as other screens
- [x] Up/down/delete controls use icons from the extended store-config icon-vocabulary entries
- [x] Add-row input matches the filled-input convention
- [x] Category-assignment selects match the theme's `Select` override
- [x] `tsc -b`, `eslint`, `vitest run`, `vite build` all pass

---

### Checkpoint

Ready to proceed to Stage 3 (Test)?

1 - Approve and continue
2 - Need changes (specify)

**Type 1 or 2.**
