---
stage: implement
bolt: 059-recipe-draft-form
created: '2026-09-08T22:05:00Z'
---

## Implementation Walkthrough: 001-recipe-manual-entry

### Summary

The `/dinners/new` page, the recipe draft that backs it, and the four editors that fill it. The
catalog gains an "Add dinner" control. Nothing is written to the database — bolt 060 owns the save.

### Structure Overview

A new `src/features/recipe-entry/` folder, shared by this unit and unit 002. The draft and every
rule about it live in one pure module with no React import; the components hold no validation logic
of their own, only the state of the field they render. The page owns the draft and passes patches
down.

### Completed Work

- [x] `recipe-entry/draft.ts` — the draft shape, its factories, validation, step numbering, tag toggling
- [x] `recipe-entry/components/RecipeEntryPage.tsx` — the route, the two entry tabs, submit wiring
- [x] `recipe-entry/components/DinnerFieldsForm.tsx` — name, cuisine, cook time, summary
- [x] `recipe-entry/components/IngredientLinesEditor.tsx` — quantity / unit / name / category lines
- [x] `recipe-entry/components/CookingStepsEditor.tsx` — ordered steps with move and remove
- [x] `recipe-entry/components/TagEditor.tsx` — attach, detach, create over the shared vocabulary
- [x] `src/App.tsx` — the `/dinners/new` route
- [x] `dinners/components/CatalogPage.tsx` — the entry point in the header

### Key Decisions

- **Step numbers are derived, never stored.** This is a deviation from the plan and the better
  design — see below.
- **Numeric fields are strings in the draft.** A draft is what the form holds mid-edit, and a
  numeric state cannot faithfully hold `"0."` or `""` while someone is typing; snapping those as
  they type is what makes numeric inputs feel broken. `parsePositiveNumber` parses once, in
  validation, and bolt 060 reuses it. Unit 002 stringifies at its boundary — one line there for a
  lossless round-trip here.
- **Line ids come from a counter, not `crypto.randomUUID()`.** They need only be unique within one
  draft and never reach the database. A counter is deterministic, which makes tests readable and
  removes any dependency on what the test environment exposes as `crypto`.
- **The draft carries tag names; nothing is written.** Creating `tags` rows as they are typed would
  mean an abandoned draft permanently pollutes a shared, household-wide vocabulary with no delete
  UI — a mistake everyone pays for, forever. Bolt 060 resolves names at save.
- **Problems are hidden until a save is attempted.** Validating every keystroke would mark the form
  invalid while the user is still filling in its first field.
- **The summary hint does not claim the catalog card.** `dinners.instructions` is required by the
  schema and rendered nowhere in the app; the hint says what the field is for and distinguishes it
  from the steps, without asserting a place it does not appear.
- **The submit button says so honestly.** With a valid draft it reports that the dinner is ready
  and that saving arrives in the next step of the build, rather than being a button that silently
  does nothing.
- **Two controls for one entry point.** A labelled "Add dinner" button from `md` up, an icon-only
  button below it. The header already carried the count badge and three controls; a sixth label
  does not fit on a phone.

### Deviations from Plan

**One, and it improves on the plan.** The plan specified `renumberSteps(steps)` returning steps
numbered contiguously from 1. Implementing it revealed that the draft does not need to store
`step_number` at all — array order _is_ the order, and the number is derived at render and at save
by `numberedSteps`.

That difference matters. With a stored number, contiguity is maintained by remembering to call a
function after every mutation, and `unique (dinner_id, step_number)` is one forgotten call away
from a violation. With a derived number there is no second copy of the ordering to fall out of
sync, so removing a middle step _cannot_ leave a gap. The constraint is satisfied by construction
rather than by discipline.

The plan's acceptance criterion is unchanged and still testable — it is the behaviour that was
specified, not the mechanism.

### Dependencies Added

None.

### Developer Notes

- `INGREDIENT_CATEGORIES` is imported from `store-config/types.ts` and rendered as a `Select`, so
  the five values exist once. Do not re-list them here.
- Cuisine suggestions use the same derivation as `CatalogPage.tsx:127-129` — read from the loaded
  dinners, not hardcoded, so the list stays true as dinners are added.
- Tag normalization is lowercase-and-trim only; it does **not** hyphenate. `Quick Meal` and
  `quick-meal` are genuinely distinct tags. That is why the existing vocabulary is shown first and
  prominently — picking beats retyping.
- The paste tab is inert and labelled as such. It exists now so unit 002 adds behaviour rather than
  restructuring the page.
- **Verified by rendering, not only by compiling.** A throwaway smoke render (since removed)
  confirmed the page mounts and that the ingredient input, the step input and the 3-servings line
  are all present. `tsc -b`, `eslint src` clean; the existing 353 tests still pass.
