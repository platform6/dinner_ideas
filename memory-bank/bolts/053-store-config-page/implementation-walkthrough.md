---
stage: implement
bolt: 053-store-config-page
created: '2026-09-04T22:55:00Z'
---

## Implementation Walkthrough: 002-store-config-page (bolt 053)

### Summary

Finished the walking-path page. Placing an ingredient is now a complete flow — a bottom sheet
that names the item's current state in plain words, offers suggestions when the engine is
confident, and always offers the full path to pick from. Added the "Not on the path yet"
section, the first-run panel, the read-only store chip, and the desktop measure.

`similarity.ts` has a caller for the first time, and the caller contract bolt 052 could not
assert — _only explicitly placed items are evidence_ — is now enforced where the candidate list
is built.

### Structure Overview

Three new presentational components plus a pill, all fed by the page. The page holds the one
piece of cross-component state that matters (which item the sheet is assigning, and the button
that opened it, for focus return); everything else is local.

The data layer grew five functions in the existing `api.ts` / `hooks.ts` split. Placement writes
reuse `usePathMutation` so they invalidate the resolution query — the view every part of the
page reads its state from.

### Completed Work

- [x] `src/features/store-config/components/AssignSheet.tsx` - the bottom sheet: resolution line, suggestions block, full-path picker, and "Take it off the path".
- [x] `src/features/store-config/components/PlacementPill.tsx` - the three placement states as one pill shape; forwards its ref so focus can return to it.
- [x] `src/features/store-config/components/UnassignedSection.tsx` - collapsed section with count and consequence subtitle; expanded, search plus item cards.
- [x] `src/features/store-config/components/FirstRunPanel.tsx` - the no-stops-configured panel.
- [x] `src/features/store-config/components/StoreConfigPage.tsx` - wires all of the above; adds the store chip, the desktop measure, and first-run branching.
- [x] `src/features/store-config/components/LocationRow.tsx` - expanded item rows gained a placement pill.
- [x] `src/features/store-config/api.ts` - `placeItem`, `unplaceItem`, `dismissSuggestion`, `fetchDismissals`, `fetchInRecipeNameKeys`.
- [x] `src/features/store-config/hooks.ts` - query and mutation wrappers for the above.

### Key Decisions

- **The sheet is a Chakra `Drawer`.** Focus trap, `Escape` close, and focus return to the
  trigger are three separate a11y requirements that Chakra already implements correctly.
  Hand-rolling them would be worse and would regress silently. `finalFocusRef` carries the
  button that opened the sheet.

- **Suggestions are computed from data already loaded, not fetched.** Candidates are the
  resolution rows with `state === 'placed'`, filtered in `AssignSheet` itself. That is story
  001's "inherited placements are never evidence", enforced at the only place that can enforce
  it.

- **One write behind two actions.** "Same spot" and picking a row in the picker both call
  `placeItem` with a different `location_id`. There is no separate accept path, so a suggestion
  cannot drift from a manual pick.

- **The suggestion block's absence is the empty state.** When nothing clears the cutoff, the
  block is not rendered and the picker heading changes from "Or pick a spot" to "Pick a spot".
  No "no suggestions found" copy — the flow has one shape either way.

- **The unassigned section is hidden at first run.** With no stops configured there is nothing
  to be "not on the path" relative to, and story 005's panel is the whole page state. It appears
  as soon as the first stop exists.

- **Desktop is pure CSS.** `maxW={{ base: '100%', md: '720px' }}` — no `useBreakpointValue`, no
  JS branch, so there is no layout flash and nothing width-dependent to go wrong at runtime.

### Deviations from Plan

None material. The plan's search-scope interpretation (search widens the _recipe-usage_ filter
but stays within unassigned items) was implemented as written and confirmed at the Stage 1
checkpoint.

### Dependencies Added

None. No new npm package, no new theme token, no new theme variant.

### Developer Notes

- **The ADR-6 risk was checked, not reasoned about.** ADR-6 records a production `42501` where a
  PostgREST `.upsert()` hit a table with column-level grants. All four new write paths were
  exercised against the local database as the `authenticated` role: the upsert's INSERT branch,
  its `DO UPDATE` branch (the exact shape that failed in ADR-6), the dismissal's `DO NOTHING`,
  and the unplace delete. All four succeed — `item_placements` and `suggestion_dismissals` carry
  no column-level carve-out.

- **`fetchInRecipeNameKeys` uses a PostgREST embed with a filter on the embedded table**
  (`dinners!inner(is_active)` + `dinners.is_active=eq.true`). That syntax can silently return
  unfiltered rows if it is wrong, so it was verified against the running REST endpoint:
  `eq.true` returns 284 rows, `eq.false` returns 0. The filter genuinely filters.

- **Dismissals are scoped per `(item, suggested_item)` pairing**, not per suggested item. The
  page derives `dismissedItemIds` from the currently-assigning item only, which is what makes
  story 003's edge case work: dismissing a pairing does not suppress the same candidate for a
  different item.

- **The desktop "preview moves onto the name's line" is a CSS concern** and is not assertable in
  jsdom, whose `matchMedia` polyfill always reports no match. Stage 3 asserts the invariant that
  is testable and that actually matters: no second panel at any width.
