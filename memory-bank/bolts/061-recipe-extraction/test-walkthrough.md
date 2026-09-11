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

That needed real pages against a real household key. **It has since been run — see the manual pass
below.**

**A note on where the strictness bites.** `no-steps` covers more than an empty array — a blank or
non-string entry anywhere in the list fails the whole extraction. That is deliberate and tested:
a blank entry means a step went missing between the page and the reply, and quietly dropping it is
the exact failure this bolt was shaped to prevent.

---

## Manual Extraction Pass — 2026-09-10

Run against the real `claude-proxy` and the household's own key, on `localhost:5173` off the `dev`
branch. Pages pasted as rendered text, the way a user pastes them. The extracted JSON was read off
the proxy response and diffed by hand against each source page's method.

### Page 1 — Smitten Kitchen, "pizza beans" (story-heavy blog, 131 KB)

Chosen because it overruns the ~46 KB budget by nearly 3x, so it exercises the trim path and the
listed risk that "comment sections consume the size budget."

- ✅ **No step lost.** The source method contains **14 distinct actions**; all 14 survive into 12
  steps. The two compressions are legal merges (season+sauté; cheese+bake), which is exactly the
  pressure valve the prompt offers instead of deletion
- ✅ **Detail preserved** — 475°F, the 10-minute sauté, the 1-minute garlic, broth in 1/4-cup
  increments up to 3/4 cup, the 10-15 minute bake
- ✅ **Rescale exact.** Source serves 8 → 3 is x0.375, and every one of the 13 ingredients matches:
  2 tbsp oil → 0.75, 550 g tomatoes → 206 g, 455 g beans → 171 g, 225 g mozzarella → 84 g. It used
  the gram weights where the source gave them
- ✅ **Trim kept the recipe and dropped the comments**, and the trim was reported to the user
- ✅ `servingsStated: true`, cook time 45 (the source's stated total), tags `[]` (correct — none of
  the household's five apply)

### Page 2 — Allrecipes, "Thai Red Curry Soup" (bare recipe card, 8 KB)

The opposite shape: no narrative, no trim, and it contains **shrimp** — one of the household's five
tags — so it also tests tag proposal end to end.

- ✅ **No step lost.** **11 source actions** into 6 steps, all present, all merges legal
- ✅ **Rescale exact.** Serves 6 → 3 is a halving: 18 shrimp → 9, 4 cups stock → 2, 3 cloves garlic
  → 1.5, one can coconut milk → 0.5
- ✅ **Tag proposed correctly** — `["shrimp"]`, from the vocabulary, nothing invented
- ✅ No trim reported, correctly, since the page fits

### Findings

**1. The summary runs long — every time.** The prompt asks for "around 80 characters" and shows a
78-character example. Live output was **197** characters (page 1) and **133** (page 2). It is a
correct compression of the steps in both cases — the right _kind_ of line, consistently 1.7-2.5x
the stated length. The instruction is being read as a suggestion. Not a code defect; the prompt
needs a harder constraint than "around 80".

**2. Cook time is ambiguous when a page splits prep from cook.** Page 1's source states one number
("TIME: 45 MINUTES") and the draft says 45. Page 2's source states Prep 25 / Cook 25 / **Total 50**,
and the draft says **25** — it took the "Cook" line. For weeknight planning the useful number is
the total; a dinner labelled 25 minutes that takes 50 is the kind of wrong that only shows up at
6pm on a Tuesday. The prompt never says which to take. Worth settling explicitly.

**3. Live proof that story 004 is not cosmetic.** The third run returned `rate_limited` — the
household's daily cap. The UI said _"The AI service couldn't be reached. Your text is still here."_
The service was reached perfectly well; the household is out of calls until tomorrow. The
placeholder copy states something false and points the user at a retry that cannot succeed. Bolt
062's per-reason messages are the fix, and this is the concrete case for them.

**4. Non-determinism is visible at the name.** Page 1 was run twice. The first produced _"Pizza
Beans (Tomato and Gigante Bean Bake)"_ — the source's own subtitle. The second produced _"Pizza
Beans (Tomato-Braised Gigante Bean Gratin)"_ — plausible, well-formed, and not what the page says.
Both are reviewable drafts and review is the point, but it shows the model will embellish a name
where it will not drop a step.

### Verdict

The Definition of Done's first line — **"a real pasted recipe page produces a correct draft, both
instruction layers, no step lost"** — is **met** on two pages of genuinely different shape, with
the rescale exact on both. The no-omission rule held under real length pressure, which was the
whole risk this bolt was built around.

**Not covered at the time**: the `no-recipe` branch, blocked by the daily call cap. **Since
closed** — see the prompt-fix verification below.

---

## Prompt Fixes and Verification — 2026-09-11

Findings 1 and 2 of the manual pass were fixed in `prompt.ts` and re-verified live against the same
pages that produced the defects. Four tests added to `prompt.test.ts` asserting the new clauses are
present (**557/557**, `tsc -b` / `eslint` / `prettier` clean).

### The two edits

**Summary** — "around 80 characters" became **"Never longer than 100 characters."** plus "If it does
not fit, compress the wording further — never drop a step to make room." The second sentence is
load-bearing: a hard cap without it is an invitation to satisfy the limit by deleting a step, which
is the failure this bolt exists to prevent.

**Cook time** — a new rule defining `cookTimeMinutes` as the **total time from starting to eating**,
instructing prep and cook to be ADDED when given separately, forbidding the cook-time-alone reading
with its consequence stated, and — new behaviour — telling the model to estimate from the cooking
steps when the page states no time at all.

That last clause also closes a hole nobody had noticed: `parse.ts:91` requires a positive integer,
so a page that never prints a time would have failed the **whole extraction** as `bad-values`. An
otherwise perfect recipe, rejected for a number the page declined to print.

### Verified live

| Check                                               | Before                         | After                               |
| --------------------------------------------------- | ------------------------------ | ----------------------------------- |
| Thai curry cook time (Prep 25 / Cook 25 / Total 50) | **25** ✗                       | **50** ✓                            |
| Thai curry summary length                           | 133                            | **97** ✓                            |
| Pizza beans summary length                          | 197                            | **90** ✓                            |
| Pizza beans steps                                   | 12 steps, 14/14 source actions | **12 steps, 14/14** — no regression |
| Thai curry steps                                    | 6 steps, 11/11 source actions  | **6 steps, 11/11** — no regression  |

**The cap did not cost a step.** This was the thing worth checking and the reason the "compress, do
not drop" sentence was written: cutting the summary from 197 to 90 characters is real pressure, and
the step list came through whole on both pages. The model compressed wording instead — "sauté
veggies+curry", "stock/milk/rice" — which is exactly the instructed behaviour.

### `no-recipe`, closed

A page of editorial boilerplate — an About/Careers/Contact page, no recipe anywhere — returned
exactly:

```
{"error": "no recipe found"}
```

The honest escape hatch, used as designed. No invented recipe, no hallucinated ingredients from
food-adjacent prose. The parser mapped it to `no-recipe` before the shape check and the pasted text
survived. **Every live path in this bolt has now been exercised.**

### One more data point for story 004

The `no-recipe` result renders as _"Couldn't read a recipe from that page."_ That is close to right
but still conflates two different situations: **there is no recipe on this page** (nothing is wrong;
try a different page) and **the reply was malformed** (something did go wrong; retrying may work).
Bolt 062 should separate them — the second is worth a retry and the first is not.
