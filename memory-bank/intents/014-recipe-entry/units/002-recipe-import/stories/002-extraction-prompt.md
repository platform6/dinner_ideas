---
id: 002-extraction-prompt
unit: 002-recipe-import
intent: 014-recipe-entry
status: complete
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 061-recipe-extraction
implemented: false
---

# Story: 002-extraction-prompt

## User Story

**As a** household member importing a recipe
**I want** the result to look like our other recipes, with nothing left out
**So that** the dinner is actually cookable and does not stand out as an import

## Acceptance Criteria

- [ ] **Given** a pasted recipe, **When** extracted, **Then** the result carries name, cuisine,
      cook time, the summary line, the ordered steps, and ingredient lines with quantity, unit,
      name and category.
- [ ] **Given** the source's method, **When** extracted, **Then** **no cooking step is dropped**.
      Every action needed to cook the dish appears in the steps, in order.
- [ ] **Given** a long source method, **When** extracted, **Then** adjacent trivial actions may be
      **merged** into one step; a distinct action may never vanish. Compression is by wording, not
      by omission.
- [ ] **Given** each extracted step, **When** read, **Then** it keeps the detail that makes it
      usable — oven temperatures, times, quantities used at that stage, and doneness cues such as
      "until the chicken is cooked through".
- [ ] **Given** the steps, **When** written, **Then** they are terse imperative sentences in the
      founding voice — "Preheat the oven to 425°F.", not "Now you'll want to go ahead and preheat".
- [ ] **Given** the extracted steps, **When** the summary line is produced, **Then** it is derived
      from them — every step represented, compressed with commas and semicolons into one terse
      line in the ~86-character house style.
- [ ] **Given** a source stating a serving count, **When** extracted, **Then** quantities are
      rescaled to **3 servings** (2 adults + 1 small child) — "serves 6" halves every quantity.
- [ ] **Given** a source stating no serving count, **When** extracted, **Then** quantities are
      taken as-is **and the draft says so**, so the user corrects rather than being silently given
      the wrong amounts.
- [ ] **Given** each ingredient, **When** extracted, **Then** it carries one of the five
      categories; nothing is left uncategorised.
- [ ] **Given** the cuisine, **When** extracted, **Then** one already in the catalog is used where
      it fits.
- [ ] **Given** the household's existing tags, **When** supplied to the model, **Then** it may
      propose only from that list — never a tag it invents.
- [ ] **Given** the tag vocabulary sent to the model, **When** assembled, **Then**
      **`rosie-approved` is excluded from it**, and rejected if returned anyway. It records that
      a family member liked the dinner — a human judgment about a person's opinion, not a
      property of the recipe — and it drives a visible heart in the catalog.
- [ ] **Given** a household with no tags yet, **When** extracted, **Then** no tags are proposed,
      and that is a normal result rather than a failure.

## Technical Notes

- Give the model founding examples in the prompt — both instruction layers of a real seeded dinner
  — rather than describing the format abstractly. The format is easier shown than specified.
- The dropped-step failure is the one the product owner specifically pushed back to prevent. The
  prompt should state the no-omission rule explicitly and permit merging as the pressure valve, so
  the model has a legal way to shorten without deleting.
- `max_tokens` is capped at 4096. A recipe's structured output fits comfortably; do not request
  more.
- Model choice comes from the proxy's allowlist. The default (`claude-sonnet-5`) is the sensible
  starting point.

## Dependencies

### Requires

- 001-paste-box-and-sizing

### Enables

- 003-response-parsing

## Out of Scope

- Parsing the response (003) and error mapping (004)
- Guessing at a recipe the paste does not contain — an absent recipe is a failed extraction
