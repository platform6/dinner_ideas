---
stage: test
bolt: 062-import-review-and-tests
created: '2026-09-11T15:30:00Z'
---

## Test Report: 002-recipe-import (review and messages)

### Summary

- **Tests**: 617/617 passed project-wide; **60 new** in this bolt
- **Gates**: `tsc -b` ✅ · `eslint` ✅ · `prettier` ✅ · `vitest` ✅
- **Live**: the handoff and the `rate_limited` message both verified against the real proxy

### Test Files

- [x] `import/messages.test.ts` (42, new) — totality over both failure families, mutual
      distinctness, no leaked codes or HTTP statuses, and the behavioural assertions that keep the
      copy honest as it is edited later
- [x] `components/RecipeEntryPage.test.tsx` (56, **+18**) — the handoff, the five proxy messages,
      the `no-recipe` distinction, and that nothing is written until an explicit save

### Acceptance Criteria Validation

- ✅ **Each reachable code has its own distinct message** — asserted as a set-size comparison, not
  as five independent "has a message" checks
- ✅ **`no_api_key` reads as setup and links to `/settings`** — plus an assertion that the text
  contains no "error/failed/sorry/wrong"
- ✅ **`rate_limited` distinguishes "used up today"** — plus an assertion it does _not_ say "try
  again"
- ✅ **`bad_request` is presented as our bug** — and does not blame the user's page
- ✅ **`no-recipe` distinguished from the malformed family**
- ✅ **No raw error object or code string reaches the interface** — per-code assertions, plus a
  component test with a `rate_limited` error carrying "HTTP 429 quota" in its message
- ✅ **Pasted text survives every failure; manual entry stays available**
- ✅ **A successful extraction lands in the editable form, steps in order** — unit-tested and
  **confirmed live**
- ✅ **Every field, line and step remains correctable**
- ✅ **Nothing is written until an explicit save** — `createDinner` not called after an import, and
  **confirmed live**: leaving the page left the catalog unchanged
- ✅ **The servings caveat shows only when the source gave no count**
- ✅ **Unit 001's entry-page tests pass unmodified** — see below
- ✅ **`tsc -b`, `eslint`, `vitest` green**

### On "unmodified", verified rather than asserted

The diff on `RecipeEntryPage.test.tsx` is **208 insertions and 1 deletion**. The single deleted line
is an assertion inside bolt 061's own servings test, whose subject this bolt deliberately moved from
the paste-tab notice to the ingredients editor.

No unit 001 test was touched: form, validation, save, duplicate-name handling, tags, step
reordering and removal all pass exactly as bolts 059 and 060 left them. The import path is additive
to a page that already worked, and the diff is the evidence rather than the claim.

### Live verification — 2026-09-11

Against the real `claude-proxy` and the household key, on `localhost:5173`.

**The handoff (story 005).** The Allrecipes Thai Red Curry Soup page pasted, imported, and landed:

- Notice on the **form** tab: _"Read 'Thai Red Curry Soup' — 6 steps, 18 ingredients. Check it over
  before saving."_
- The form tab is the selected tab; the user is looking at what was filled in
- Name, cuisine, summary, **cook time 50** (the bolt 061 prompt fix holding in a third run),
  18 ingredient lines, 6 steps **in order**
- **No red validation** on the fresh draft
- No servings caveat, correctly — this source states its serving count
- Navigating away and returning to the catalog: **the dinner is not there.** Nothing was written,
  which is FR-7's guarantee observed rather than argued

**The `rate_limited` message (story 004).** Reached honestly — the household's daily cap was hit
mid-testing — and rendered:

> "That's all the recipe reading for today — the household's daily limit is used up. It resets
> tomorrow. You can still type this one in."

Worth putting beside what the same situation said yesterday, before this bolt: _"The AI service
couldn't be reached. Your text is still here."_ The service had been reached perfectly well. The old
copy stated something false and pointed at a retry that could not succeed; the new copy states what
happened, when it changes, and what the user can do instead. That is the entire content of story
004, observed live rather than inferred from a unit test.

### Issues Found

None in this bolt's code.

One **operational** note, not a defect: the household's `Daily call limit` was set to **3**, which
blocked live testing on two consecutive days. It is a household setting on `/settings`, it was
raised to 10 by the product owner to finish this pass, and it is worth a deliberate decision rather
than a default — 3 is a reasonable guard on a metered API for family use, and tight during a build.

### Notes

**What this suite still does not prove.** Extraction _quality_ remains outside unit testing, exactly
as bolts 061 and 062 both said up front. No test here pretends otherwise.

That evidence sits in bolt 061's report and is now complete: two page shapes, 25 source cooking
actions with none lost, exact rescaling at x0.375 and x0.5, the prompt fixes verified, and every
live failure path exercised including `no-recipe` and `rate_limited`. This bolt adds the last
missing piece — that a real extracted draft arrives in the form correctly and writes nothing — and
with it the unit's cut criterion has its evidence.

**The structural guarantee is now load-bearing in a test.** `createDinner` is unreachable from the
import path, and a test asserts it is not called after an import. If a future change gives this
path a save of its own, that test fails. FR-7's "review cannot be skipped" is held by the shape of
the code, and the test is what keeps the shape.
