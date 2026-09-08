---
id: 003-response-parsing
unit: 002-recipe-import
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 061-recipe-extraction
implemented: false
---

# Story: 003-response-parsing

## User Story

**As a** household member importing a recipe
**I want** a bad extraction to fail honestly
**So that** I never review a half-parsed draft that looks plausible and is wrong

## Acceptance Criteria

- [ ] **Given** a well-formed response, **When** parsed, **Then** it becomes a draft in unit 001's
      shape, ready for the form.
- [ ] **Given** a malformed or partial response, **When** parsed, **Then** it is treated as a
      **failed extraction** — not salvaged into a partial draft.
- [ ] **Given** a response carrying a summary line but **no steps**, **When** parsed, **Then** it
      is a failed extraction. A dinner with no steps is not saveable, so a draft without them is
      not reviewable either.
- [ ] **Given** a refusal, **When** it arrives, **Then** it lands in the same failure path. Per the
      proxy README a `stop_reason: "refusal"` returns **HTTP 200** with whatever text — it looks
      like success and must not be handled as one.
- [ ] **Given** any failure, **When** reported, **Then** the user's pasted text is preserved and
      they can retry or switch to manual entry.
- [ ] **Given** a parsed draft, **When** it contains a category outside the five, a non-positive
      quantity, or a non-positive cook time, **Then** those are caught at the boundary rather than
      carried into the form as invalid state.
- [ ] **Given** returned tags, **When** parsed, **Then** any not already in the household's
      vocabulary is **dropped**, and `rosie-approved` is dropped even if it is in the vocabulary.
      An unrecognised tag is not a reason to fail the whole extraction — it is simply not a tag.

## Technical Notes

- The proxy is typed `{ text: string }`. There is no structured-output mode, no tool use and no
  schema enforcement anywhere in the path, so **all** validation is this side's responsibility.
- Prefer a strict parse with an explicit shape check over defensive coercion. Coercion is what
  turns a malformed response into a plausible-looking wrong draft.
- Per the coding standards, `any` is discouraged but not banned; a parsed-unknown boundary is one
  of the places a narrow cast is justified — narrow it immediately.

## Dependencies

### Requires

- 002-extraction-prompt

### Enables

- 005-draft-review-handoff

## Edge Cases

| Scenario                                    | Expected Behavior                                     |
| ------------------------------------------- | ----------------------------------------------------- |
| The model wraps its output in prose         | Parsed if the structure is recoverable; failed if not |
| A response listing ingredients but no steps | Failed extraction, explicitly                         |
| A truncated response (hit `max_tokens`)     | Failed extraction; not a partial draft                |
| A refusal returning 200                     | Failed extraction, with the text kept                 |

## Out of Scope

- Retrying automatically — a retry spends another metered call and is the user's choice
