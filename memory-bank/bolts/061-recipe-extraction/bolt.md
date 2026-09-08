---
id: 061-recipe-extraction
unit: 002-recipe-import
intent: 014-recipe-entry
type: simple-construction-bolt
status: planned
stories:
  - 001-paste-box-and-sizing
  - 002-extraction-prompt
  - 003-response-parsing
created: '2026-09-07T03:05:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 060-recipe-save
enables_bolts:
  - 062-import-review-and-tests
requires_units: []
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 4
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 061-recipe-extraction

## Objective

Turn pasted page text into a draft in the founding format, or into an honest failure.

## Why `simple-construction-bolt`

A new caller of an existing, frozen service. No domain model, no schema, no migration. Same shape
as bolt 039, which was the proxy's first caller.

The **uncertainty** is high even though the complexity is not: prompt behaviour cannot be reasoned
about the way code can, and has to be tried against real pages.

## Scope

| Story                    | Priority | Note                                                      |
| ------------------------ | -------- | --------------------------------------------------------- |
| 001-paste-box-and-sizing | Must     | Empty refused with no call; oversize trimmed from the end |
| 002-extraction-prompt    | Must     | The whole of FR-5's format contract                       |
| 003-response-parsing     | Must     | Defensive; a step-less or malformed result is a failure   |

Tag inference (FR-10) rides along in 002 and 003: the prompt proposes only from the existing
vocabulary, and the parser drops anything outside it.

## What matters here

**No cooking step may be dropped.** This is the requirement the product owner pushed back to add,
and it is the reason this bolt exists in the shape it does. The prompt states the no-omission rule
explicitly and offers _merging_ as the legal way to shorten, so the model has somewhere to go under
length pressure other than deleting a step.

**Show, do not describe.** Put a real founding dinner's both-layer output in the prompt. The format
is easier demonstrated than specified.

**Parse strictly.** The proxy returns `{ text }` with no schema enforcement anywhere in the path.
Defensive coercion is what turns a malformed response into a plausible-looking wrong draft — prefer
a strict shape check and an honest failure.

**Tags are proposed, never invented.** Send the household's existing vocabulary and accept only
from it. **Exclude `rosie-approved` outright** — it means a family member liked the dinner, and
a model asserting that is fabricating a person's opinion into a visible heart in the catalog.

**A refusal returns HTTP 200.** It looks like success and carries unparseable text. It must land in
the failure path, not be handled as an unexpected success.

## Risks

| Risk                                                | Mitigation                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Steps dropped to satisfy a length target            | No-omission stated explicitly; merging offered; step-less = hard failure |
| A partial parse presented as a reviewable draft     | Strict shape check; partial results are failures                         |
| Prompt tuned against one blog and brittle elsewhere | Try several real pages of different shapes before calling it done        |
| Comment sections consuming the size budget          | Trim from the end; budget computed from the actual prompt size           |

## Definition of Done

- A real pasted recipe page produces a correct draft, both instruction layers, no step lost
- Quantities rescaled to 3 servings, or the draft says the source gave no serving count
- Empty paste makes no API call; oversize is trimmed from the end with the user told
- Malformed, truncated, step-less and refusal responses all fail cleanly with the text kept
- `tsc -b`, `eslint`, `vitest` green
