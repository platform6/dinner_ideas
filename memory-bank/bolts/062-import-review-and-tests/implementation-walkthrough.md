---
stage: implement
bolt: 062-import-review-and-tests
created: '2026-09-11T14:45:00Z'
---

## Implementation Walkthrough: 002-recipe-import (review and messages)

### Summary

An extracted draft now lands in the same form manual entry uses, and every way the import can fail
says which thing went wrong and what to do about it. The unit still writes nothing of its own —
saving remains unit 001's, reached only by the user pressing the button.

### Structure Overview

One new module holds every message, pure and free of React, so the wording is testable without
rendering anything. The page gains four pieces of state and a controlled tab index; the handoff
itself is a `setDraft` rather than any new mechanism, because the draft was already page-level
state. The ingredients editor gains one optional prop for the servings caveat.

### Completed Work

- [x] `recipe-entry/import/messages.ts` — every proxy code and every extraction reason mapped to
      English, with an optional link for the one case whose answer is "go set something up"
- [x] `recipe-entry/import/messages.test.ts` — totality, mutual distinctness, no leaked codes
- [x] `recipe-entry/components/RecipeEntryPage.tsx` — the handoff, controlled tabs, split feedback
- [x] `recipe-entry/components/PasteImportPanel.tsx` — renders a failure and its optional link
- [x] `recipe-entry/components/IngredientLinesEditor.tsx` — the unscaled-quantities caveat
- [x] `recipe-entry/components/RecipeEntryPage.test.tsx` — story 004, 005 and 006 coverage

### Key Decisions

- **Distinctness is asserted, not assumed.** Story 004 asks for five codes with five messages, and
  the obvious test — "every code has a message" — passes just as happily when three of them are the
  same sentence. The suite compares the set size against the count instead, for both families. The
  story's real requirement is that a user can tell the situations apart, because retry, wait and
  go-set-something-up are three different actions.
- **`no_api_key` gets a link and is tested for NOT reading as an error.** Every household starts
  without a key; telling a new user that something failed on their first attempt would be false.
  A test asserts the message contains no "error/failed/sorry/wrong", which is the kind of thing
  that quietly rots when copy is edited later.
- **`rate_limited` is tested for the ABSENCE of "try again".** It is the one failure where retrying
  is useless, and the generic reassuring tail that suits `timeout` would be actively misleading
  here. Asserting the absence is what stops a future tidy-up from making all five messages rhyme.
- **`no-recipe` separated from the malformed family**, the distinction the live pass surfaced.
  "There is no recipe on that page" ends there — no invitation to retry — while a malformed reply
  invites one.
- **Feedback is split by where the user will be.** A success moves them to the form tab, so the
  success notice renders there; a failure leaves them on the paste tab with their text, so the
  failure renders there. A single shared notice would have announced half its messages to an empty
  room.
- **The fresh draft is not painted red.** `hasAttemptedSave` is reset on import. An extracted draft
  is not the user's mistake, and marking it invalid before they have touched anything reads as an
  accusation.
- **The servings caveat lives beside the 3-serving line**, not at the top of the page, and it is
  page state rather than editor state so it dies with the draft it describes. A test asserts it is
  absent when the source did state a count — a warning shown every time is one nobody reads.
- **`messageForThrown` takes `unknown`.** That is what `catch` actually hands you. A non-`ClaudeError`
  is a bug here rather than a service failure, and it gets a message that does not blame the user's
  page or print the exception.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- **The tabs are now controlled** (`index` + `onChange`). That was required to land the user on the
  form after an import; it also means any future code that wants to move tabs has a handle to do
  it, rather than reaching into the DOM.
- **"Unit 001's tests pass unmodified" is verifiable, and was verified**: the diff on
  `RecipeEntryPage.test.tsx` is **208 insertions and 1 deletion**. The single deleted line is an
  assertion inside bolt 061's own servings test, whose subject this bolt deliberately moved from
  the paste notice to the ingredients editor. No unit 001 test — form, validation, save, duplicate
  name, tags, step reordering — was touched.
- **The unit still has no save.** `createDinner` is reachable only from `handleSubmit`, and a test
  asserts it is not called after an import. If a future change gives this path a save of its own,
  that test fails, which is the point of it.
