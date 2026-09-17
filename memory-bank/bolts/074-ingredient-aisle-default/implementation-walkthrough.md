---
stage: implement
bolt: 074-ingredient-aisle-default
created: '2026-09-17T16:25:38Z'
---

## Implementation Walkthrough: ingredient-aisle-default

### Summary

A draft ingredient line's aisle may now be unset, and each line records who set it: nobody,
the household's history, or a choice (by the cook or an import). New lines start unset, saving
refuses an unset line with "Choose an aisle.", and typing a name the household has saved before
fills its aisle from the most recently created dinner, unless the aisle was chosen.

### Structure Overview

The rules are pure functions in the draft module, beside `validateDraft`: building the history map,
renaming a line, and choosing an aisle. The editor only calls them. The history is one read of
`dinner_ingredients` with each line's dinner creation time, exposed through a query hook keyed under
`['dinners']`, so saving a dinner refreshes it. The page passes the resulting map into the editor,
as it already does with servings. Import marks its lines as chosen at the parse boundary, which is
the one place drafts are built from Claude output.

### Completed Work

- [x] `src/features/recipe-entry/draft.ts` - aisle may be unset; per-line category source; new
      lines start unset; history map with most-recent-wins; rename and choose rules; save
      validation message for an unset aisle
- [x] `src/features/recipe-entry/import/parse.ts` - imported lines are marked as chosen
- [x] `src/features/recipe-entry/api.ts` - reads the household's saved ingredient names, aisles and
      dinner creation times; the save refuses to send a line with no aisle
- [x] `src/features/recipe-entry/hooks.ts` - aisle-history query: once per form open, no refetch on
      window focus, refreshed by the existing save invalidation
- [x] `src/features/recipe-entry/components/IngredientLinesEditor.tsx` - takes the history as a
      prop; name edits go through the rename rule and aisle picks through the choose rule; a
      disabled "Choose aisle" first option; the aisle control has its own error slot
- [x] `src/features/recipe-entry/components/RecipeEntryPage.tsx` - loads the history and passes it
      to the editor, with a stable empty map while it loads

### Key Decisions

- **Provenance on the line, not a separate map**: the draft must stay serializable and travel through
  import, scaling and undo unchanged. A field on the line does that for free, because scaling
  spreads each line.
- **Imports are "chosen"**: confirmed at Checkpoint 2. The mark goes in at parse, so no later code
  has to remember where a draft came from.
- **Reads `dinner_ingredients`, not the catalog list**: the catalog query is active dinners only,
  and a "Not interested" dinner's aisles are still the household's.
- **Late history fails safe**: a name typed before the query resolves stays unset. Nothing fills
  in behind the cook's back.
- **Save throws on an unset aisle rather than defaulting**: unreachable after validation, but an
  aisle has no honest fallback.
- **"Choose an aisle."** ends with a full stop, matching every other validation message in the draft.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- `tsc -b` and `eslint src/features/recipe-entry` pass.
- Vitest: 723/735. All 12 failures are fixtures that relied on the old Produce default: the
  shared `validDraft()` helper and the page's `fillValidDraft()` never pick an aisle, so saves are
  now correctly blocked; and the fixed-options test now also sees "Choose aisle". Stage 3 updates
  them.
- `RecipeEntryPage.test.tsx` mocks `@/features/recipe-entry/api` partially (`importOriginal`), so
  `fetchAisleHistory` is real there. Stage 3 must mock it; otherwise the page tests would call the
  real Supabase client.
