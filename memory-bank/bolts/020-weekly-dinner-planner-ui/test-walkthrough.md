---
stage: test
bolt: 020-weekly-dinner-planner-ui
created: 2026-08-28T01:35:00Z
---

## Test Report: weekly-dinner-planner-ui (bolt 020)

### Summary

- **New tests**: `src/features/dinners/components/CatalogFilters.test.tsx` — 8 tests, 8 passing, stable across repeated isolated + full-suite runs.
- **Type / lint / build**: `npx tsc -b` ✅ · `npx eslint .` ✅ · `npx vite build` ✅
- **Full suite (`npx vitest run`)**: **132 / 132 passing, deterministic** (4/4 runs) after applying the pre-existing-flake fix described below.

### Test Files

- [x] `src/features/dinners/components/CatalogFilters.test.tsx` — **new**. Covers the FR-13/FR-14 split:
  - separate "Cuisine" and "Tags" dropdown buttons render; no "More" control remains
  - Cuisine dropdown lists only cuisines; picking one reports `{ cuisine: <name> }` via `onChange`
  - Tags dropdown lists only tags; picking one reports `{ tags: [<tag>] }` (OR-set) via `onChange`
  - active tag chip clears its tag on click; active cuisine chip clears the cuisine on click
  - Tags dropdown hidden when the tag vocabulary is empty
  - Cuisine dropdown hidden when there are no cuisines
  - "All" and "Quickest" inline controls still present

### Acceptance Criteria Validation

- ✅ **FR-13 — "Tags" dropdown beside the cuisine dropdown**: rendered when `availableTags` non-empty; hidden when empty (2 tests).
- ✅ **FR-13 — full vocabulary, multi-select, OR semantics, chips**: Tags dropdown lists all `availableTags`; selecting reports a tag array; chip clears on click.
- ✅ **FR-14 — "More" → "Cuisine"**: button queried by accessible name `Cuisine`; a `/^more/i` button is asserted absent. `aria-label="Cuisine"` set in source.
- ✅ **FR-14 — cuisine dropdown holds only cuisines**: `kid-friendly` checkbox asserted absent inside the Cuisine dropdown.
- ✅ **"All" / "Quickest" unchanged**: still present by accessible name.
- ✅ **`CatalogFilterState` / `filters.ts` untouched**: neither file modified; `git diff --stat` limited to `CatalogFilters.tsx`, `icons.tsx`, and the two test files.
- ✅ **Gate**: `tsc -b`, `eslint`, `vite build` all clean.

### Pre-existing flake — found and fixed (not caused by this bolt)

Two tests flaked in the full multi-worker `vitest run` and **passed reliably in isolation**:

- `src/features/dinners/components/DinnerCard.test.tsx` › "suppresses the dinner via the overflow menu (FR-5)"
- `src/features/dinners/components/CatalogPage.test.tsx` › "suppresses a dinner via the card overflow menu's \"Not interested\" (FR-5)"

**Evidence it predates this bolt**: with `CatalogFilters.test.tsx` removed, `npx vitest run` still fails these same 2 tests 3/3 runs (122/124). The first full-suite run during Stage 2 happened to pass 124/124 — it is timing-dependent.

**Cause**: both do `user.click(overflow button)` then `screen.getByRole('menuitem', { name: /not interested/i })` **synchronously**. Chakra's `Menu` renders its items in a portal after an open transition; under full-suite CPU contention the transition hasn't finished when the sync query runs. `CatalogFilters.test.tsx` avoids this by using `findByRole` after opening a menu.

**Fix applied (user-approved, 2 lines)**:

- `DinnerCard.test.tsx` and `CatalogPage.test.tsx`: `screen.getByRole('menuitem', …)` → `await screen.findByRole('menuitem', …)` at the overflow-menu "Not interested" click.
- After the fix: `npx vitest run` → 132/132, 4/4 consecutive runs.

### Issues Found

None in the bolt-020 changes. The pre-existing test-suite flake was fixed as part of this bolt (2 lines).

### Notes

- Source changes for this bolt: `M CatalogFilters.tsx`, `M icons.tsx`, `?? CatalogFilters.test.tsx`, plus the 2-line flake fix in `M CatalogPage.test.tsx` / `M DinnerCard.test.tsx`.
- The `vite build` >500 kB chunk-size warning is pre-existing and unrelated.
