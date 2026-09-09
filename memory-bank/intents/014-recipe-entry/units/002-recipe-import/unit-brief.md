---
unit: 002-recipe-import
intent: 014-recipe-entry
phase: inception
status: ready
created: '2026-09-07T02:55:00Z'
updated: '2026-09-07T03:20:00Z'
---

# Unit Brief: Recipe Import

## Purpose

Fill unit 001's form from a pasted recipe page instead of the keyboard, in the founding format,
without losing a cooking step.

## Scope

### In Scope

- A paste box on the entry page, alongside the manual path
- Oversize handling: trim from the end against the frozen 50 KB cap, and say so
- The extraction prompt — the whole of FR-5's format contract lives here
- A defensive parser turning the proxy's `{ text }` into a draft, or into a clean failure
- Mapping every reachable proxy error code to a distinct plain-language message
- **Tag inference**, bounded to the existing vocabulary (FR-10)
- Handing the parsed draft to unit 001's form for review

### Out of Scope

- **Any write to the database.** This unit produces a draft and stops. Unit 001 owns the save
- Any change to `claude-proxy` — auth, key resolution, rate limiting and logging are frozen
- URL fetching, in any form (see requirements, "Why paste rather than fetch")
- Streaming, tool use, or structured-output modes the proxy does not have

---

## Assigned Requirements

| FR    | Title                                    | Priority |
| ----- | ---------------------------------------- | -------- |
| FR-4  | Import by pasting recipe text            | Must     |
| FR-5  | Matches the founding format, both layers | Must     |
| FR-6  | Oversize paste trimmed, never silently   | Must     |
| FR-7  | Review before saving                     | Must     |
| FR-10 | Inferred tags stay inside the vocabulary | Should   |

## Key Constraints

- **No cooking step may be dropped.** This is the requirement the product owner pushed back to
  add, and it is the one this unit exists to honour. Compression happens in wording; a distinct
  action may never vanish. Adjacent trivial actions may be _merged_.
- **The proxy returns text, not JSON.** No schema enforcement exists anywhere in the path, so the
  parser must be defensive and treat anything malformed as a failure rather than salvage it.
- **A refusal returns HTTP 200.** Per the proxy README, `stop_reason: "refusal"` is not an error.
  It arrives as a successful call carrying unparseable text and must land in the same failure path
  as a bad parse — not as an unhandled success.
- **An extraction with no steps is a failure, not a draft.** Otherwise the quiet degradation is a
  summary line and nothing to cook from.
- **Every import spends a metered call** against the household's daily cap — including one the
  user abandons without saving. The call was made and metered; there is no refund and none is
  being built (resolved decision 2). Worth surfacing so the cost is not a surprise.
- **Tag inference is bounded, never generative.** Only tags already in the vocabulary may be
  proposed, and **`rosie-approved` is excluded outright** — it means a family member liked the
  dinner, a human judgment about a person's opinion rather than a property of a recipe, and it
  drives a visible heart in the catalog.
- **The proxy's contract is frozen.** 50 KB in, 4096 tokens out, model allowlist, non-streaming.

## This unit is cuttable

Unit 001 ships a complete entry page. If extraction is poor enough that correcting a draft is
slower than typing the recipe, the right outcome is to **say so and cut it** rather than ship a
feature that costs an API call to save nothing.

**Cut criterion**: an imported draft must be faster to correct than to type. If review routinely
means rewriting most fields — and especially if steps routinely arrive missing or mangled — that
is the signal.

## Risks

| Risk                                                    | Mitigation                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Steps silently dropped to hit a length target           | FR-5 forbids omission outright and permits merging only; a step-less extraction is a hard failure |
| Blog prose folded into the summary or the steps         | Prompt targets the founding voice; review step shows every field                                  |
| Comment sections blowing the 50 KB cap                  | Trim from the end, where comments live; tell the user it happened                                 |
| A malformed response half-parsed into a plausible draft | Parse defensively; partial results are failures, not drafts                                       |
| Quantities left at the source's serving count           | Prompt rescales to 3 servings; when the source states none, the draft says so                     |
| An invented tag polluting the shared vocabulary         | Inference is bounded to existing tags; anything else is dropped, never created                    |
| `rosie-approved` machine-applied                        | Excluded from the vocabulary sent to the model, and rejected if returned                          |

## Interfaces Consumed

Unit 001 shipped on 2026-09-08 (bolts 059, 060), so these are no longer forward references — the
concrete artifacts exist and are named here.

| Interface                                                | From                                                       | Notes                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /functions/v1/claude-proxy`                        | intent 007                                                 | `feature: 'recipe_import'`; contract unchanged                                                 |
| `RecipeDraft`                                            | `src/features/recipe-entry/draft.ts`                       | **What extraction must produce.** Serializable by design, for exactly this                     |
| `createEmptyDraft`, `createIngredientLine`, `createStep` | same file                                                  | Line ids come from a counter; extraction must build lines through these, not hand-roll ids     |
| `validateDraft`                                          | same file                                                  | The draft must pass this before it can be saved; a parse that cannot is a failure, not a draft |
| `RecipeEntryPage`                                        | `src/features/recipe-entry/components/RecipeEntryPage.tsx` | Where the draft lands for review — the "Paste a recipe" tab is already there and inert         |
| `useSaveDinner` → `fn_create_dinner`                     | `src/features/recipe-entry/hooks.ts`                       | Unit 001 owns the save. This unit writes **nothing** (ADR-13)                                  |

### Two things unit 001 settled that constrain extraction

- **Numeric fields are strings in the draft** (`quantity`, `cookTimeMinutes`), because a draft is
  what the form holds mid-edit. Extraction produces numbers from Claude and must stringify them at
  its boundary — one line, and it keeps the round trip lossless.
- **Tags are NAMES, not ids, and nothing is written until save.** Inferred tags (FR-10) land in
  `draft.tagNames` as normalized strings and appear in the tag editor as ordinary attached tags.
  A tag row created during an abandoned import would permanently pollute a shared household
  vocabulary that has no delete UI.
- **Step numbers do not exist on the draft.** Order is position; `numberedSteps` derives the
  number. Extraction produces an ordered array and nothing else.

## Dependencies

**Requires**: `001-recipe-manual-entry`

**Enables**: none — this is the last unit of the intent

## Definition of Done

- Pasted page text produces a correct draft in the founding format, both instruction layers
- Every cooking step from the source survives, in order, with temperatures, times and doneness cues
- Quantities are rescaled to 3 servings, or the draft says the source gave no serving count
- An oversize paste is trimmed from the end and the user is told before seeing the result
- Every reachable proxy error code produces its own plain message, and the pasted text is never lost
- A refusal, a malformed response, or a response with no steps all fail cleanly with the text kept
- The draft is always reviewable and always requires an explicit save — this unit never writes
- Inferred tags come only from the existing vocabulary; `rosie-approved` is never among them
- `tsc -b`, `eslint`, `vitest` all green
