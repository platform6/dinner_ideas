---
stage: plan
bolt: 061-recipe-extraction
created: '2026-09-09T01:12:00Z'
---

## Implementation Plan: 002-recipe-import (extraction)

### Objective

Turn pasted page text into a draft in the founding format, or into an honest failure. Stories 001,
002, 003.

Bolt 062 owns the error messages and the handoff into the form, so this bolt ends with a **typed
result** rather than a finished user journey.

---

## Verified before planning

Checked rather than assumed, because three of this intent's stories described a codebase that had
moved on:

| Claim                          | Verified                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The proxy caps input at 50 KB  | **50,000 bytes**, and the check is exactly `new TextEncoder().encode((system ?? '') + messages.map(m => m.content).join('')).length` — `pipeline.ts:134` |
| `max_tokens` ceiling           | 1..4096, `rates.ts`                                                                                                                                      |
| A refusal returns HTTP 200     | Yes — README: "`stop_reason: "refusal"` is **not** an error"                                                                                             |
| The proxy already has a caller | Yes — `ClaudeAiCard.tsx`'s "Test connection" (bolt 039). This is genuinely the second caller, as the brief says                                          |
| `callClaude` is the client     | `src/features/ai/api.ts`, typed, throws `ClaudeError` with a code                                                                                        |
| The household's tag vocabulary | **5 tags on production**: `bean sprouts`, `chicken`, `kim`, `noodles`, `shrimp`                                                                          |

**The vocabulary finding matters twice.** It is small and idiosyncratic — these read as ingredient
words, not the "weeknight / quick" style the stories imagine — so **most imports will propose no
tags at all**, and story 002 already says that is a normal result rather than a failure. Good; the
alternative would have been a model inventing a vocabulary.

It also means **`rosie-approved` is not in the vocabulary today**, so excluding it is currently a
no-op. It stays in anyway: the rule is about what a model may never assert, and the tag can be
created by hand at any time from bolt 059's tag editor. A guard that is a no-op today and correct
tomorrow is worth its two lines.

---

## Technical Approach

### 1. The size budget mirrors the proxy's arithmetic exactly

Story 001's last AC is absolute: _the proxy must never answer this caller with `bad_request` for
size._ That is only achievable by computing the same number the proxy computes.

**In UTF-8 bytes, not characters.** `'é'.length === 1` but encodes to 2 bytes; an em-dash is 3, an
emoji 4. A recipe page pasted from a real blog is full of these — `½`, `°`, `—`, curly quotes. A
character-count budget would pass locally and be rejected by the proxy on exactly the pages this
feature exists for.

```
budget = 50_000 − bytes(system) − bytes(fixed message scaffolding)
```

The system prompt is large (it carries a worked example), so the budget is meaningfully below
50,000 and must be derived from the actual prompt string, never hardcoded.

**Trimming from the end**, per the story: the recipe sits near the top of a recipe page; the tail
is comments. Truncating to a byte budget must not split a multi-byte character, so trimming is a
**binary search over the string index** — encode, compare, narrow. `O(log n)` encodes, exact, and
trivially testable. Slicing the byte array and decoding would produce a replacement character.

A small safety margin under the cap absorbs any JSON-transport difference; the check is on content
only, so the margin is precaution rather than necessity.

### 2. The prompt shows the format rather than describing it

A **system prompt** carrying the format contract and one real founding dinner in full — bolt 061's
brief is explicit that the format is easier demonstrated than specified. The worked example is
`Chicken Fajita Bowls`, read from the seed rather than invented:

- summary (`dinners.instructions`): _"Saute chicken, peppers, and onion with seasoning; serve over
  rice with cheese."_ — 78 characters, both clauses joined by a semicolon
- 4 steps, terse imperative, each keeping its usable detail

That example demonstrates the two-layer relationship the stories describe: **the summary is the
steps compressed**, not a separate thought. Showing one is worth a paragraph of specification.

**The no-omission rule is stated explicitly, with merging offered as the pressure valve.** This is
the requirement the product owner pushed back to add. A model under length pressure will shorten
somehow; the prompt's job is to make merging the legal move so deletion is not the reachable one.

**Rescaling to 3 servings**, and — when the source states no serving count — taking quantities
as-is _and saying so_. The "said so" flag is part of the response shape, not a guess the parser
makes.

**Tags**: the household's vocabulary is sent, minus `rosie-approved`, with an instruction to
propose only from it. Belt and braces: the parser drops anything outside the list regardless.

**Output**: JSON. The proxy has no structured-output mode and no schema enforcement anywhere in the
path, so the format is requested in the prompt and _enforced_ in the parser. The prompt asks for
JSON only, with no prose around it; the parser tolerates fences because models add them, and that
tolerance is a known, bounded exception rather than general coercion.

### 3. The parser is strict, and its failures are typed

The story is emphatic: _prefer a strict shape check over defensive coercion. Coercion is what turns
a malformed response into a plausible-looking wrong draft._

So `parseExtraction(text, vocabulary)` returns a discriminated union — a draft, or a reason:

| Reason       | When                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `not-json`   | No JSON object recoverable. **This is where a refusal lands** — it arrives as HTTP 200 with prose |
| `bad-shape`  | Parsed, but a required field is missing or the wrong type                                         |
| `no-steps`   | Steps absent or empty — a dinner with no steps is not saveable, so it is not reviewable           |
| `bad-values` | A category outside the five, a non-positive quantity, a non-positive cook time                    |

**A refusal needs no special case.** It returns 200 with unparseable text, so a strict parser routes
it to `not-json` on its own. Special-casing `stop_reason` is impossible anyway — the proxy's
response type is `{ text }` and does not carry it.

**Design call — a bad ingredient fails the extraction rather than being dropped.** The tag rule is
explicitly the opposite (an unrecognised tag is dropped, "it is simply not a tag"), and the
difference is deliberate: a missing tag costs a filter, a missing ingredient costs a shopping-list
line and is invisible in review. Silently dropping one is the same family of harm as a dropped
step, which is the failure this whole bolt is shaped around.

**The output of a success is bolt 059's `RecipeDraft`** — numeric fields as strings, tag names not
ids, no `step_number` field. Extraction stringifies at this boundary, which is exactly the one line
unit 001's brief anticipated.

### 4. The paste box

On the existing "Paste a recipe" tab, which bolt 059 shipped inert precisely so this bolt adds
behaviour rather than restructuring the page.

- **Empty or whitespace-only is refused client-side with no API call.** An empty call still spends
  a metered call against the daily cap — the cheapest possible bug to avoid.
- A trim is reported **before** the draft is shown, so the user knows the input was shortened.
- The pasted text is preserved on failure, always. A retry costs another metered call and is the
  user's choice (story 003's out-of-scope is explicit that retry is not automatic).

### 5. What this bolt does NOT do

- **No error messages for proxy failures** — story 004, bolt 062. This bolt surfaces a typed
  reason; 062 turns reasons and `ClaudeErrorCode`s into English.
- **No handoff into the form** — story 005, bolt 062. Extraction returns a draft; landing it in the
  editors is next.
- **No save.** Unit 001 owns that entirely (ADR-13). This unit writes nothing.
- **No change to the proxy**, its limits, or its contract. It is frozen.
- **No automatic retry.**

---

## Acceptance Criteria

- [ ] A paste box on the existing tab accepts a rendered recipe page including surrounding prose
- [ ] Empty / whitespace-only is refused with **no API call**
- [ ] The request never exceeds 50,000 bytes, computed the proxy's way, **in UTF-8 bytes**
- [ ] Oversize is trimmed from the **end**, never splitting a multi-byte character
- [ ] A trim is reported before the draft is shown
- [ ] The prompt carries a real founding example, both layers
- [ ] The prompt states no-omission explicitly and offers merging
- [ ] Tags are proposed only from the household's vocabulary; `rosie-approved` is excluded from
      what is sent **and** rejected if returned
- [ ] Malformed, truncated, step-less and refusal responses all produce a typed failure
- [ ] A bad category / non-positive quantity / non-positive cook time fails rather than reaching
      the form
- [ ] An unrecognised tag is dropped, not a failure
- [ ] A success produces a valid `RecipeDraft` that `validateDraft` accepts
- [ ] The pasted text survives every failure
- [ ] `tsc -b`, `eslint`, `vitest` green

---

## The honest limit of this bolt's testing

**Prompt behaviour cannot be unit-tested.** The bolt's own complexity metadata says uncertainty 4
against complexity 3, and the risk table names it: _"prompt tuned against one blog and brittle
elsewhere."_

What the suite can prove: the byte budget, the trim direction and boundary safety, the strict
parser against every malformed shape, the tag filtering, and that a well-formed response becomes a
draft `validateDraft` accepts.

What it cannot: that a real recipe page produces a _correct_ draft with no step lost. That is the
first line of the Definition of Done and it needs real pages against a real key — a manual check,
recorded as such, not something to be quietly implied by green unit tests.

---

## Out of Scope

- Fetching a URL — requirements settled on paste ("Why paste rather than fetch")
- Error copy and the review handoff — bolt 062
- Any change to the proxy or to unit 001's save path
