---
stage: plan
bolt: 070-extraction-reports-servings
created: '2026-09-11T17:47:27Z'
---

## Implementation Plan: 002-scale-on-review (extraction reports, code scales)

### Objective

Take the arithmetic away from the model. The extraction reports the quantities and the serving
count **exactly as the page wrote them**, and a pure, tested module does any multiplication.
Stories 001 and 002. Bolt 071 puts the control on the screen.

---

## Verified before planning

| Claim                                             | Verified                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The rescaling rule is one paragraph of the prompt | `prompt.ts:140`, parameterised by bolt 069 to use the household's N                                                    |
| `servingsStated` is the only serving signal today | A boolean: `prompt.ts` shape, `parse.ts:129`, `extract.ts:25`, the page's `quantitiesUnscaled`                         |
| Nothing saves serving information                 | `createDinner` maps named fields only (bolt 060). A field on the outcome never reaches the database                    |
| Quantities are strings on the draft               | `RecipeDraft.ingredients[].quantity: string` (bolt 059). Scaling parses, multiplies and re-stringifies at one boundary |

---

## Technical Approach

### 1. The prompt reports, and stops rescaling

- **Removed:** _"Quantities are for N servings. If the source states a serving count, rescale every
  quantity to N."_ The instruction is gone entirely, not reworded.
- **Added:** _"Copy every quantity exactly as the page gives it. Never rescale, convert or round."_,
  stated as a prohibition with its reason. Bolt 061 found that prohibitions hold and adjectives do
  not, so the wording follows that finding.
- **Shape:** `"servingsStated": boolean` becomes **`"yield": string | null`**, what the page
  says it serves, **verbatim**: `"4"`, `"8–10"`, `"Makes 24 cookies"`, or `null`.
- **`buildSystemPrompt` loses its `servingsPerDinner` argument, and so does `extractRecipe`.**
  The model no longer needs the household's number at all. That is the boundary moving. Bolt 069
  added the argument knowing this bolt would remove it.
- The worked example (Chicken Fajita Bowls) gains `"yield": "4"` and keeps its own quantities.

**Naming (bolt 069's language rule):** the field is `yield`, never "servings". `servings_per_dinner`
is the household's target and `yield` is the page's claim. They must not share a word in code.

### 2. The parser carries the yield as stated, leniently

- A string is trimmed and kept **verbatim**. A number becomes its string (`4` → `"4"`). Anything
  else (`null`, missing, an object, an empty string) becomes `null`.
- **Lenient, like tags, not strict, like ingredients.** A malformed yield costs the scaling
  control a base, and nothing else. It is never saved (ADR-14), so failing a good recipe over it
  would be all cost and no benefit. Ingredients stay strict because a bad one silently corrupts a
  shopping list.
- **No interpretation in the parser.** "8–10" stays "8–10". Deciding what a yield means as a
  number is a separate, pure step (below), so the raw statement survives to the screen.

### 3. Where the yield lives: the outcome, not the draft

Story 001's AC says "the draft carries the count". **This plan deliberately keeps it off
`RecipeDraft`**, and records that as a deviation from the story's wording:

- `RecipeDraft` is the shape of what gets saved (bolt 059: "an INTERFACE"). ADR-14 says a yield is
  never stored. Putting it on the draft would make every future reader of the draft wonder whether
  it is persisted.
- It travels on `ExtractionSuccess` as `sourceYield: string | null`, and the page holds it in state
  for the review, the way it already holds `quantitiesUnscaled`.

### 4. A pure scaling module: `recipe-entry/scale.ts`

**`readYield(yield: string | null)`** → what a yield means numerically:

- `{ kind: 'single', servings: n }` for a plain positive integer, possibly with words around
  it (`"4"`, `"Serves 4"`, `"4 servings"`)
- `{ kind: 'range', low, high }` for `"8–10"`, `"8-10"`, `"8 to 10"`, with low < high
- `{ kind: 'unknown' }` for anything else, including `null`, `"Makes 24 cookies"`, or
  `"a crowd"`. When in doubt it is unknown, because a wrong base means wrong quantities.

**A range is never collapsed to a number here** (Checkpoint 2: the user supplies the base). The
module reports the range, and bolt 071 asks.

**`scaleDraft(draft, from, to)`** → a **new** draft:

- Every ingredient quantity × (to ÷ from), rounded by the rule below
- **Non-destructive.** The input draft is untouched, so the caller keeps it for undo (FR-3)
- **Identity is exact.** `from === to` returns the quantities unchanged, **without rounding**.
  Scaling 4 → 4 must not turn "0.33" into "0.375"
- A quantity that is not a positive number (the user may have edited it before scaling) is left
  exactly as it is. The module cannot scale what is not a number, and says nothing about it
- `from` and `to` must be positive integers; anything else throws. That is a programming error, not
  a user one

### 5. The rounding rule, written down

1 cup scaled by ⅓ is 0.333… cup, which nobody can measure. Rounding badly recreates the bug that
started intent 018 from the other direction. **The rule:**

| Scaled value     | Rounded to        | Why                                                                      | Example       |
| ---------------- | ----------------- | ------------------------------------------------------------------------ | ------------- |
| ≥ 10             | nearest **whole** | grams, millilitres, counts; a tenth of a gram is noise                   | 206.25 → 206  |
| 1 to < 10        | nearest **¼**     | tablespoons, cups, pounds; quarters are on every measure                 | 2.67 → 2.75   |
| < 1              | nearest **⅛**     | ⅛ cup and ⅛ tsp are the smallest common measures                         | 0.333 → 0.375 |
| would round to 0 | **⅛** (the floor) | `dinner_ingredients.quantity > 0`; a scaled ingredient must never vanish | 0.04 → 0.125  |

- Values are written as plain decimals (`"0.375"`, `"2.75"`), matching how quantities are already
  shown. Fraction display is out of scope.
- Units are **not** converted. 0.375 cup stays cups. Converting to tablespoons is a judgment call
  about a single ingredient, and not this module's to make.
- The rule is **one function with a table-driven test**, so changing it later changes one place
  and fails one test.

### 6. The page, correct if 070 ships alone

After this bolt **every** import lands as written, so a caveat is always true. The page stops
deriving `quantitiesUnscaled` from a boolean and passes the yield instead:

- **No yield:** the existing caveat stands (_"That page didn't say how many it serves…"_)
- **A yield:** _"These quantities are as the page wrote them — for {yield}. They have NOT been
  adjusted to {N}."_

Bolt 071 puts the scale control beside this caveat. It does **not** land here, but without the
line above, 070 on its own would show a page's quantities for 8 people with no hint they are not
for the household.

---

## What this bolt must NOT do

- **No scale control in the UI.** That is bolt 071
- **No automatic scaling.** FR-4 still holds; nothing calls `scaleDraft` in this bolt
- **No change to what is saved.** The yield never reaches `createDinner` (ADR-14)
- **No change to the proxy**

## Acceptance Criteria

- [ ] The prompt contains **no** rescaling instruction, and a test asserts the absence
- [ ] The prompt tells the model to copy quantities exactly and report the yield verbatim
- [ ] `buildSystemPrompt` and `extractRecipe` no longer take the household size
- [ ] The outcome carries `sourceYield`, verbatim, including ranges and non-numeric statements
- [ ] A malformed yield becomes `null` and never fails an otherwise valid extraction
- [ ] `readYield` distinguishes single, range and unknown, and never collapses a range
- [ ] `scaleDraft` is non-destructive, exact at identity, and leaves non-numeric quantities alone
- [ ] The rounding rule is table-tested: up, down, whole, quarter, eighth, repeating decimal, floor
- [ ] With a yield, the review says what the quantities are for, and that they are unadjusted
- [ ] `tsc -b`, `eslint`, `vitest` green

## The honest limit

Whether the model actually **stops** rescaling, and reports the yield verbatim, depends on a live
model. Unit tests prove what the prompt _says_, not what the model _does_. A live check against a
page that states a yield, looking for unchanged quantities and a verbatim yield, is the evidence,
and it is recorded as a manual check in the test report.
