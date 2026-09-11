---
stage: plan
bolt: 062-import-review-and-tests
created: '2026-09-11T14:05:00Z'
---

## Implementation Plan: 002-recipe-import (review and messages)

### Objective

Land the extracted draft in unit 001's form, say something useful and specific when the call fails,
and cover the boundary. Stories 004, 005, 006.

Bolt 061 ends at a typed result. This bolt turns that result into a journey — and closes the unit.

---

## Verified before planning

Checked rather than assumed, in the same spirit as bolt 061's pre-flight:

| Claim                                 | Verified                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The tabs are uncontrolled             | `RecipeEntryPage.tsx:160` — `<Tabs variant="enclosed" size="sm">`, no `index`. Landing the draft on the form tab requires making them controlled           |
| The draft is already page-level state | `RecipeEntryPage.tsx:64` — `const [draft, setDraft] = useState<RecipeDraft>(createEmptyDraft)`. The handoff is a `setDraft`, not a new mechanism           |
| The 3-serving line already exists     | `IngredientLinesEditor.tsx:64` — "Quantities are for 3 servings…". Story 005's servings caveat belongs beside it, not somewhere new                        |
| The reachable error codes             | `ai/api.ts:10` — `no_session`, `no_household`, `no_api_key`, `rate_limited`, `bad_request`, `upstream_error`, `timeout`. Story 004 scopes to the last five |
| `extractRecipe` does not swallow them | `extract.ts:53` — `ClaudeError` propagates by design; mapping it is this bolt's job                                                                        |
| Unit 001's save is untouched          | `api.ts` `createDinner` is called only from `handleSubmit`. The import path has no save to call                                                            |

---

## Technical Approach

### 1. Messages live in a pure module, not in the component

A new `recipe-entry/import/messages.ts` mapping both failure families to English:

- `ClaudeErrorCode` → message (story 004's five, plus a safe default)
- `ExtractionFailure | 'empty'` → message (bolt 061's typed reasons)

Pure and exported, so every message is unit-testable without rendering a page, and so story 006's
"each code asserts its own distinct message" is a table test rather than six component tests.

**A test will assert the messages are distinct from each other.** Six strings that each exist but
three of which are identical would pass a naive "has a message" test while failing the story's
actual intent — the user must be able to tell the situations apart.

### 2. The messages say what to DO, because that is the story's point

The user needs to know whether to retry, wait, or go set something up. Drafting intent, wording to
settle in implementation:

| Situation        | Reads as                                                                | Action implied       |
| ---------------- | ----------------------------------------------------------------------- | -------------------- |
| `no_api_key`     | Claude isn't set up for this household yet — with a link to `/settings` | Go set it up         |
| `rate_limited`   | Today's limit is used up; it resets tomorrow                            | Wait, don't retry    |
| `upstream_error` | Something went wrong reaching Claude                                    | Retry is fine        |
| `timeout`        | Claude took too long                                                    | Retry is fine        |
| `bad_request`    | Something is wrong on our side — **our bug, not the user's**            | Retry won't help     |
| `no-recipe`      | There's no recipe on that page                                          | Try a different page |
| malformed family | Claude's answer couldn't be read                                        | Retry may work       |

**`no_api_key` is not an error and must not read as one.** It is how every household starts. A link
to `/settings` rather than prose telling them to go find it.

**`no-recipe` versus the malformed family is the distinction the manual pass surfaced.** Both
currently render as "Couldn't read a recipe from that page", which conflates "nothing is wrong,
that page has no recipe on it" with "something went wrong, try again". Different actions, so
different messages.

**No raw code or error object reaches the UI** (story 004's last AC) — the map is total, with a
default for the unreachable cases, so there is no path where a code string could be rendered.

### 3. The handoff is a `setDraft` and a tab switch

On success:

1. `setDraft(outcome.draft)` — the form does not know or care where its contents came from, which
   is exactly what keeps unit 001 independent of unit 002
2. Switch to the "Type it in" tab, which requires the `Tabs` to become **controlled** (`index` +
   `onChange` with a `tabIndex` state)
3. Carry `servingsStated` into page state so the form can show the caveat
4. Clear any stale save `rejection`, and leave `hasAttemptedSave` **false** so a freshly imported
   draft is not immediately painted red before the user has done anything

**Where the feedback appears has to change.** Today the notice renders inside the paste panel. After
a successful import the user is on the _other_ tab, so a success notice there would be invisible.
So: **success feedback moves to the form tab; failure feedback stays on the paste tab**, where the
user still is and where their text still sits.

### 4. The servings caveat sits with the quantities

When `servingsStated` is false, the source gave no serving count, quantities were taken as-is, and
the user must check them. That warning belongs immediately beside `IngredientLinesEditor.tsx:64`'s
existing "Quantities are for 3 servings" line — the one place the user is already looking when
reading quantities. Not a page-top banner they scroll past.

It must clear when the draft is replaced or the form is reset, or it will outlive the draft it
describes.

### 5. What this bolt must NOT do

- **No save of its own.** FR-7's guarantee is structural: review cannot be skipped because no path
  skips it. If this bolt finds itself needing a save, the boundary was drawn wrong
- **No separate import-preview screen.** The review surface is the entry form, deliberately
- **No change to the proxy, the parser, or unit 001's save path**
- **No auto-retry**

---

## Test Plan (story 006)

Unit tests for `messages.ts`: every code maps, messages are mutually distinct, no code string
appears in any message.

Component tests on the page: each error code surfaces its own message with the pasted text intact;
a successful import lands on the form with fields and steps **in order**; nothing is saved until an
explicit save (`createDinner` not called); the servings caveat appears only when the source gave no
count.

**The constraint that matters: unit 001's entry-page tests must pass unmodified.** The import path
is additive to a page that already worked, and an unmodified suite is the evidence — the same
standard bolt 058 was held to.

**One honest note about that claim.** Bolt 061 _did_ modify one test in `RecipeEntryPage.test.tsx`
— it replaced "says the paste path is not built yet" with a real paste-box assertion. That test
described unit 002's boundary while it was still inert, not unit 001's form behaviour. The tests
this bolt must not touch are unit 001's: the form, validation, save, duplicate-name handling, tags
and step reordering. Worth stating plainly rather than letting "unmodified" quietly mean "except
the one I changed".

---

## Acceptance Criteria

- [ ] Each of the five reachable proxy codes produces its own distinct message
- [ ] `no_api_key` reads as setup, not failure, and links to `/settings`
- [ ] `rate_limited` distinguishes "used up for today" from a retryable error
- [ ] `bad_request` is presented as our bug, not user error
- [ ] `no-recipe` is distinguished from the malformed family
- [ ] No raw error object or code string reaches the interface
- [ ] The pasted text survives every failure, and manual entry stays available
- [ ] A successful extraction lands in the editable form, steps in order
- [ ] Every field, ingredient line and step remains correctable, reorderable, removable
- [ ] Nothing is written until an explicit save, and leaving the page writes nothing
- [ ] The servings caveat shows with the quantities when the source gave no count
- [ ] **Unit 001's entry-page tests pass unmodified**
- [ ] `tsc -b`, `eslint`, `vitest` green

---

## The honest limit of this bolt's testing

Unchanged from bolt 061, and worth restating because this bolt closes the unit: **extraction quality
cannot be unit-tested.** What can be tested is sizing, parsing, failure classification and the
handoff — thoroughly. No test here should pretend to verify that a real page produces a correct
draft.

That evidence already exists and is recorded: the manual pass of 2026-09-10 and the prompt-fix
verification of 2026-09-11, covering two page shapes, 25 source actions with none lost, exact
rescaling, and every live failure path including `no-recipe`. This bolt adds a **handoff** check to
that manual evidence — that a real imported draft arrives in the form correctly — and nothing more.

---

## Out of Scope

- Fetching a URL; error copy for `no_session` (the app's existing concern); token usage or cost
- Any change to `claude-proxy`, which is frozen
