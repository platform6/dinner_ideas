---
stage: implement
bolt: 061-recipe-extraction
created: '2026-09-09T01:35:00Z'
---

## Implementation Walkthrough: 002-recipe-import (extraction)

### Summary

Pasted page text becomes a draft in the founding format, or a typed failure. The extraction
machinery is three pure-ish modules plus a paste box on the tab bolt 059 shipped inert.

### Structure Overview

A new `import/` folder inside `recipe-entry`. The prompt module owns the format contract and the
byte budget; the parser owns the strict shape check; `extract.ts` is the only piece that touches
the network, and it is a thin composition of the other two. Everything the suite needs to falsify
is reachable without mocking `fetch`.

### Completed Work

- [x] `recipe-entry/import/prompt.ts` — system prompt, tag vocabulary, byte budget, byte-safe trim
- [x] `recipe-entry/import/parse.ts` — strict parse to `RecipeDraft`, typed failures, tag filtering
- [x] `recipe-entry/import/extract.ts` — empty guard, trim, one proxy call, parse
- [x] `recipe-entry/components/PasteImportPanel.tsx` — the paste box and its disabled state
- [x] `recipe-entry/components/RecipeEntryPage.tsx` — the paste tab now runs an extraction

### Key Decisions

- **The budget is computed in UTF-8 bytes, from the actual prompt.** `pipeline.ts:134` checks
  `TextEncoder().encode(system + contents).length > 50_000`, so anything else is a guess. Measured
  after building: the system prompt is **3,283 bytes**, leaving a **46,205-byte** paste budget, so
  a typical recipe page goes whole and trimming is the exception it should be.
- **Trimming is a binary search over the string index**, not a slice of the byte array. Slicing
  bytes and decoding would leave a replacement character mid-word; searching the index cannot split
  a multi-byte sequence at all.
- **One tolerance, then strictness.** `recoverJson` takes the first `{` to the last `}` because
  models add fences and preambles. After that there is no coercion anywhere — every field is
  type-checked and a mismatch is a typed failure.
- **A refusal needs no special case.** It arrives as HTTP 200 carrying prose, so the strict parser
  routes it to `not-json` unaided. Special-casing `stop_reason` is impossible regardless: the
  proxy's response type is `{ text }` and does not carry it.
- **A bad ingredient fails; a bad tag is dropped.** Deliberately asymmetric, and the stories ask
  for exactly this. A missing tag costs a filter; a missing ingredient costs a shopping-list line
  and is invisible in review — the same family of harm as a dropped step.
- **`rosie-approved` is guarded twice**: withheld from the vocabulary sent to the model, and
  rejected by the parser even if returned. "The model was told not to" is not an enforcement.
- **`extractRecipe` does not catch `ClaudeError`.** It owns what the extraction can get wrong, not
  what the service can; mapping `rate_limited` / `no_api_key` to English is story 004, bolt 062.
- **The empty guard is in two places on purpose** — the button is disabled, and `extractRecipe`
  refuses independently. The button is the affordance; the function is the guarantee, and unit 002's
  later callers will go through the function.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- **The worked example in the prompt is real data**, read from the seed: `Chicken Fajita Bowls`,
  its 78-character summary and its four steps. It demonstrates the thing hardest to specify — that
  the summary is the steps compressed, not a separate description. If the founding style ever
  changes, this example should be re-read rather than edited by hand.
- **The prompt tells the model to return `{"error": "no recipe found"}`** for a page with no
  recipe, and the parser maps that to `no-recipe` before the shape check. An honest "there is no
  recipe here" is not a malformed response and should not be reported as one.
- **The production tag vocabulary is five ingredient-ish words** (`bean sprouts`, `chicken`, `kim`,
  `noodles`, `shrimp`), so most imports will legitimately propose no tags. Story 002 already calls
  that a normal result. `rosie-approved` is not among them, so its exclusion is currently a no-op —
  kept because the tag can be created by hand at any time from bolt 059's editor.
- **The success notice is a placeholder and says so.** The draft does not land in the form yet
  (story 005) and there is no per-reason error copy (story 004) — both are bolt 062. The wording
  reports honestly what happened rather than implying the journey is finished, the same approach
  bolt 059 took with its save button.
