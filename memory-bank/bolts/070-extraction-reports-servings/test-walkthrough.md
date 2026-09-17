---
stage: test
bolt: 070-extraction-reports-servings
created: '2026-09-11T17:56:44Z'
---

## Test Report: 002-scale-on-review (extraction reports, code scales)

### Summary

- **Tests**: **697/697** project-wide, **+69** in this bolt
- **Gates**: `tsc -b` ✅ · `eslint .` ✅ (0 errors; the pre-existing `any` warning in the Edge
  Function) · `prettier` ✅
- **Coverage**: no coverage tooling in this project; counts reported instead
- **Live check against a real model**: **NOT RUN.** See the end of this report. It is the only
  evidence that the model actually stops rescaling, and it is outstanding

### Test Files

- [x] `src/features/recipe-entry/scale.test.ts` (new): `readYield` single / range / unknown,
      including pieces-not-people; the rounding rule as one table; `scaleDraft` up, down, identity,
      non-destructive, non-numeric lines, unrelated fields, bad arguments
- [x] `src/features/recipe-entry/components/import-quantity-note.test.ts` (new): the three
      things the review can say about an import, and "a count of pieces is never a match"
- [x] `src/features/recipe-entry/import/prompt.test.ts`: bolt 069's "rescales to the household
      size" tests are **inverted**: the rescaling instruction is now asserted **absent**, and the
      prompt builder takes no household size
- [x] `src/features/recipe-entry/import/parse.test.ts`: the yield kept verbatim across five shapes,
      a number becoming its string, and six malformed yields becoming `null` without failing the recipe
- [x] `src/features/recipe-entry/import/extract.test.ts`: the outcome carries the yield verbatim,
      a range stays a range, and the page's quantity arrives unchanged
- [x] `src/features/recipe-entry/components/RecipeEntryPage.test.tsx`: bolt 069's "sends the
      household size to the model" is **inverted**, and the page quantities land unchanged with a note
      saying what they are for, including a "matches your household" case and no note on a hand-typed
      dinner

### Acceptance Criteria Validation

**001-extraction-reports-servings**

- ✅ The prompt contains no instruction to rescale, asserted as an **absence**
- ✅ The yield is carried as the page stated it: "8–10" stays "8–10" through parser, outcome and
  screen
- ✅ No yield: the draft records none (`null`), and the review says so
- ✅ Ingredient quantities are the source's, unmodified: asserted on the outcome and on the
  rendered form
- ⚠️ **"When extracted, the draft carries the count"**: the yield rides on the _outcome_, not on
  `RecipeDraft`. This is a deliberate deviation recorded in the plan (§3): the draft is the shape
  that gets saved, and a yield never is (ADR-14)

**002-scaling-is-pure-code**

- ✅ Every quantity × ratio: `scaleDraft`, pure, in code
- ✅ A **new** draft; the source survives for undo: asserted by comparing the input before and
  after
- ✅ Repeating decimals round to something measurable by a **written** rule: one table, 15 cases,
  four bands including the floor
- ✅ Whole numbers, fractions, up, down and identity are all covered, and identity is exact

### The assertions were checked by breaking the code

Four plausible regressions were introduced one at a time. Each was caught by exactly the test
written for it:

1. **The rescaling rule reworded back into the prompt** → `contains NO instruction to rescale`
   failed
2. **`scaleDraft` made destructive**, mutating its input → `is NON-DESTRUCTIVE` failed
3. **The identity short-circuit removed** (4 → 4 now rounds) → `returns quantities UNCHANGED at
identity` failed
4. **`readYield` collapsing a range to its low end** → every `reads … as a RANGE` case failed

All four were restored and the suite re-run green.

### Issues Found

**1. One test expectation of mine was wrong, not the code.** A `scaleDraft` test expected 2 × 3⁄9
to round to 0.75. It is 0.667, and the rule rounds below 1 to the nearest ⅛, which is **0.625**,
the value the same file's rounding table already asserts. Fixed in the test. The table is what
caught it.

**2. No defects in the code.**

### Notes

**The live check is outstanding, and it is the check that matters.** Whether the model actually
_obeys_ "copy every quantity exactly" and reports the yield verbatim depends on a real model,
exactly as bolt 061's quality depended on one. The unit tests prove what the prompt says. They
cannot prove what the model does. It could not be run here: the Chrome extension was not connected,
and the proxy needs a signed-in household session that cannot be created on the user's behalf.

**The check to run** (one call): paste Mel's Kitchen Cafe's salted chocolate toffee pretzel bark,
the page that started intent 018. Expected:

- **yield "8–10" verbatim**, not 9, not 3
- **butter "1" cup**, the page's own number and not 0.33
- the review note: _"These quantities are as the page wrote them — for 8–10. They have NOT been
  adjusted to {N}."_

Until that runs, **acceptance for story 001 rests on the prompt's wording**, which is the same
position bolt 061 was in before its manual pass.

**Local dev caveat:** a local frontend pointed at production cannot read `servings_per_dinner`
until migration `20260911173308` is deployed. The entry form falls back to 3. The import itself is
unaffected, because it no longer uses the household size at all.
