---
stage: test
bolt: 061-recipe-extraction
created: '2026-09-10T19:35:00Z'
---

## Test Report: 002-recipe-import (extraction)

### Summary

- **Tests**: 553/553 passed project-wide; **102 new** in this bolt
- **Gates**: `tsc -b` ✅ · `eslint .` ✅ (0 errors; one pre-existing `any` warning in
  `supabase/functions/claude-proxy/anthropic.ts`, outside this bolt) · `vitest` ✅ · `prettier` ✅
- **Coverage**: no coverage tooling is configured in this project, and none was added — per
  `coding-standards.md`, "no formal percentage… focus tests on logic that's genuinely risky to get
  wrong." Counts are reported instead of a number that would mean nothing here.

### Test Files

- [x] `src/features/recipe-entry/import/prompt.test.ts` (24) — UTF-8 byte counting, the trim
      direction and its character-boundary safety, the budget's relationship to the proxy cap, and
      the prompt's load-bearing clauses (no-omission, merging, the worked example, the category
      list, the vocabulary, the no-recipe escape hatch)
- [x] `src/features/recipe-entry/import/parse.test.ts` (48) — every typed failure against every
      malformed shape, the strict/lenient asymmetry between ingredients and tags, and the
      round-trip guarantee that a success passes unit 001's `validateDraft`
- [x] `src/features/recipe-entry/import/extract.test.ts` (25) — the empty guard proven by the
      absence of a call, the request the proxy actually receives, the size cap asserted rather
      than trusted, and `ClaudeError` propagation
- [x] `src/features/recipe-entry/components/RecipeEntryPage.test.tsx` (38, **5 new**) — the paste
      path end to end: what the user is told, and that the pasted text survives every failure

### Acceptance Criteria Validation

- ✅ **A paste box on the existing tab** — `offers a paste box on the paste tab`
- ✅ **Empty / whitespace-only refused with no API call** — asserted twice, and in the way that
  matters: `expect(mockedCallClaude).not.toHaveBeenCalled()`, across empty, spaces, and
  newlines/tabs. The disabled button is the affordance; the absence of the call is the guarantee
- ✅ **Never exceeds 50,000 bytes, computed the proxy's way, in UTF-8** — `requestBytes` asserted
  under the cap for ASCII, emoji and em-dash pastes; also checked on the real call arguments
- ✅ **Trimmed from the end** — a tail marker is provably absent while the head survives
- ✅ **Never splits a multi-byte character** — ⚠️ **this criterion initially FAILED.** See below
- ✅ **A trim is reported before the draft is shown** — `trimmed` is carried on success _and_ on
  failure, so a trim cannot be lost behind an error
- ✅ **The prompt carries a real founding example, both layers** — the summary string and a step
  string are both asserted present
- ✅ **No-omission stated, merging offered** — both asserted
- ✅ **Tags proposed only from the vocabulary; `rosie-approved` excluded from what is sent and
  rejected if returned** — both guards tested independently, the second with `rosie-approved`
  deliberately present in the vocabulary
- ✅ **Malformed, truncated, step-less and refusal all produce a typed failure** — including a
  refusal routed to `not-json`, and a blank step in an otherwise valid list refused rather than
  dropped
- ✅ **Bad category / non-positive quantity / non-positive cook time fail** — 9 cases, including
  the string-typed number a coercing parser would have accepted
- ✅ **An unrecognised tag is dropped, not a failure**
- ✅ **A success produces a draft `validateDraft` accepts** — the contract between this unit and
  unit 001, asserted directly
- ✅ **The pasted text survives every failure** — proven for an extraction failure and for a
  `ClaudeError`, and the button is left enabled rather than stuck on "reading"
- ✅ **`tsc -b`, `eslint`, `vitest` green**

### Issues Found

**1. `trimToBytes` split emoji in half — found by test, fixed.**

The binary search runs over the **string index**, and the implementation comment claimed that this
made splitting a multi-byte character impossible. It does not. An astral character — any emoji — is
a **surrogate pair occupying two string indices**, so the cut can land between them. A lone high
surrogate encodes as U+FFFD (3 bytes), which the search then measures as "fitting":

- `trimToBytes('🍤', 3)` returned `'�'` instead of `''`
- `trimToBytes('🍤🍤🍤', 7)` returned `'🍤�'` instead of `'🍤'`

Two- and three-byte characters were never at risk — one string index each — so `é`, `½`, `—` and
curly quotes were always safe. Only the four-byte case was wrong, which is why the failure survived
implementation: it is exactly the case the comment named as motivating the design.

**Fix**: `src/features/recipe-entry/import/prompt.ts` now drops a trailing lone high surrogate
after the search (`isHighSurrogate`), and the doc comment no longer overclaims.

**Impact if shipped**: one replacement character at the very end of a trimmed paste — the tail,
which is comment section. Low harm, but the acceptance criterion is unconditional and the code
asserted a guarantee it did not provide.

**2. Two defects in the tests themselves, not the code.** Recorded because a test report that
only ever indicts the implementation is not being honest about where the mistakes were: an
assertion that `½` is three UTF-8 bytes (it is two — U+00BD sits under U+0800), and a trim test
whose "recipe" half did not actually overrun the budget, so a sliver of the tail legitimately
survived. Both were wrong expectations, corrected in the tests.

### Notes

**What this suite cannot prove, and does not imply.** The plan named this and it still holds:
prompt behaviour is not unit-testable. The suite proves the byte budget, the trim, the parser
against every malformed shape, the tag rules, and that a well-formed reply becomes a saveable
draft. It does **not** prove that a real recipe page yields a _correct_ draft with no step lost —
the first line of the bolt's Definition of Done.

That needs real pages against a real household key, and it has **not been done**. Green tests here
must not be read as satisfying it. Concretely, still outstanding:

- A real pasted page produces a correct draft, both instruction layers, no step lost
- Quantities rescaled to 3 servings, or the draft says the source gave no serving count
- Several pages of different shapes (a story-heavy blog, a bare recipe card, a printed-recipe view),
  because "tuned against one blog and brittle elsewhere" is the bolt's own listed risk

Until that manual pass is run, the DoD is **partially met**: everything mechanical is verified;
the extraction-quality line is not.

**A note on where the strictness bites.** `no-steps` covers more than an empty array — a blank or
non-string entry anywhere in the list fails the whole extraction. That is deliberate and tested:
a blank entry means a step went missing between the page and the reply, and quietly dropping it is
the exact failure this bolt was shaped to prevent.
