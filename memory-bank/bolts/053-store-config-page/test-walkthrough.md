---
stage: test
bolt: 053-store-config-page
created: '2026-09-04T23:00:00Z'
---

## Test Report: 002-store-config-page (bolt 053)

### Summary

- **Tests**: 285/285 passing (32 files) — **32 new** in this bolt
- **Before this bolt**: 253 across 30 files
- **Unit total**: 72 tests now cover `store-config` (40 from bolt 052 + 32 here)

| Gate              | Result           |
| ----------------- | ---------------- |
| `npx vitest run`  | 285/285 passed   |
| `npx tsc -b`      | Clean            |
| `npx eslint src/` | Clean            |
| `npx vite build`  | ✓ built in 4.28s |

### Test Files

- [x] `src/features/store-config/components/AssignSheet.test.tsx` - **16 new**: all three resolution lines, the suggestion block's presence and absence, the explicit-placement candidate contract, accept, dismiss, dismissal suppression, the picker and its current-location marker, "Take it off the path" in both directions, Escape, focus trap, focus return.
- [x] `src/features/store-config/components/UnassignedSection.test.tsx` - **9 new**: consequence subtitle and count scope, singular/plural, collapsed default, default scope vs. full-catalog search, result shape, both empty states, "Place" opening the flow.
- [x] `src/features/store-config/components/StoreConfigPage.test.tsx` - **7 added** (19 total): first-run panel and its copy, adding the first stop, the unassigned section hidden at first run, the read-only store chip, single-column invariant, and the end-to-end place-an-item path.
- [x] `similarity.test.ts` / `location-name.test.ts` (bolt 052) - unchanged, still green.

### Acceptance Criteria Validation

**Story 003 — assign flow**

- ✅ Opens from a placement pill and from the unassigned section's "Place"
- ✅ All three resolution lines in plain words: `Dairy · not placed`,
  `Dairy · placed in Produce`, `Grains · following Grains to Bakery`
- ✅ Suggestions sit above the picker with the matched item, its location, "Same spot", and a
  dismiss ×
- ✅ **Inherited placements are never evidence** — the same twin item flipped from `placed` to
  `inherited` produces no suggestion. This is the caller contract bolt 052's pure-function tests
  could not assert, and it is now covered.
- ✅ Nothing pre-selected or auto-applied — accepting requires the explicit "Same spot" click
- ✅ Below the cutoff: no block, no "no suggestions found" copy, heading becomes "Pick a spot"
- ✅ Picker lists the full path in order; the current explicit location carries `aria-current`
- ✅ "Take it off the path" appears for `placed` and **not** for `inherited`
- ✅ Focus trap (12 consecutive tabs never leave the dialog), `Escape` closes, focus returns to
  the opener

**Story 004 — unassigned section**

- ✅ Collapsed by default, with a count chip and the consequence subtitle
- ✅ Default scope = in-recipe items only (an orphan item is excluded from the count _and_ the
  list)
- ✅ Search reaches the full catalog — the orphan is findable by name
- ✅ Name, category, and a "Place" action per result
- ✅ Both empty states, both neutral: "Everything has a spot on the path." and the term quoted
  back

**Story 005 — first run and desktop**

- ✅ First-run panel: heading, way-in copy, "Add the first stop", and the closing line about
  alphabetical order
- ✅ Adding the first stop from the panel writes at position 1
- ✅ The unassigned section is hidden at first run
- ✅ The active store renders as a chip and **not** as a control (no button role) — v1 is
  read-only
- ⚠️ **Desktop is asserted structurally, not by width.** See "Notes".

**Story 007 — consolidated tests**

- ✅ `similarity.test.ts` covers normalization, the false-friend families, rarer-token
  weighting, the category tiebreaker, dismissal exclusion, and the cutoff boundary (bolt 052)
- ✅ `StoreConfigPage.test.tsx` covers the unified list, add/rename/remove, reorder, the
  destructive confirm's count and its empty-stop bypass, first run, and desktop
- ✅ `AssignSheet.test.tsx` covers all of story 007's named cases
- ✅ `UnassignedSection.test.tsx` covers default scope vs. search, both empty states, and
  "Place"
- ✅ The old `GroceryStoreRow` / `CategoryRowAssignment` shapes are gone from the tests along
  with the code
- ✅ **Similarity is not mocked** in the assign-flow tests — fixtures are scored for real

### Issues Found

**One defect in my own first draft of the tests.** The focus-return test unmounted the whole
tree (`rerender(<div />)`) and then asserted nothing meaningful — the opener it was supposed to
check had been unmounted too. A test that cannot fail is worse than no test. Rewritten as a
stateful harness with a real trigger and real open/close state, asserting the opener does _not_
have focus while the sheet is open and _does_ have it after `Escape`.

**No defects found in the implementation.** Every acceptance criterion passed on first run,
including the focus trap and Escape handling — the payoff for using Chakra's `Drawer` rather
than hand-rolling three a11y behaviours.

### Notes

- **Desktop width is not directly assertable here.** jsdom's `matchMedia` polyfill
  (`src/test/setup.ts`) always reports no match, so responsive hooks resolve to `base`. The
  implementation is pure CSS (`maxW={{ base: '100%', md: '720px' }}`) precisely so there is no
  JS branch to get wrong — but that also means there is no JS behaviour to assert. The tests
  cover the invariant that actually matters and _is_ testable at every width: **no second panel**
  (no `combobox`, no `complementary`, no "Category assignments"). The 600–720px measure itself
  is a visual check.
- **The suggestion fixture is scored for real.** "Organic Black Beans" against a placed "black
  beans" normalizes to identical tokens and clears the 0.5 cutoff genuinely. If
  `SIMILARITY_TUNING.scoreCutoff` is ever raised past that, this file fails — which is the
  intended coupling, not an accident.
- **`dismissedItemIds` is derived per assigning item.** The page filters dismissals to the item
  currently in the sheet, which is what makes story 003's edge case hold: dismissing a pairing
  does not suppress the same candidate for a different item.
- **Unit 002 is now complete.** With bolt 052's 40 tests, the store-config feature carries 72.
