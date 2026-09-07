---
id: 001-paste-box-and-sizing
unit: 002-recipe-import
intent: 014-recipe-entry
status: planned
priority: must
created: '2026-09-07T03:00:00Z'
assigned_bolt: 061-recipe-extraction
implemented: false
---

# Story: 001-paste-box-and-sizing

## User Story

**As a** household member looking at a recipe on a blog
**I want** to paste the page in and have the recipe pulled out of it
**So that** I do not retype something that is already on my screen

## Acceptance Criteria

- [ ] **Given** the entry page, **When** it renders, **Then** a paste box accepts the text of a
      rendered recipe page, including whatever narrative surrounds the recipe.
- [ ] **Given** an empty or whitespace-only paste, **When** submitted, **Then** it is refused
      client-side with a clear message and **no** API call is made — an empty call still spends a
      metered call against the daily cap.
- [ ] **Given** a paste exceeding the proxy's 50 KB limit on `system + messages`, **When**
      submitted, **Then** it is trimmed from the **end** — keeping the top, where the recipe sits,
      and dropping the tail, where comment sections live.
- [ ] **Given** a trimmed paste, **When** the result is shown, **Then** the user was told plainly
      that trimming happened, **before** they see the extracted draft.
- [ ] **Given** any paste, **When** the request is built, **Then** it never exceeds the cap — the
      proxy must never answer this caller with `bad_request` for size.

## Technical Notes

- The cap is on `system + messages` combined, so the prompt's own size counts against it. Compute
  the budget from the actual prompt, not from 50 KB flat.
- Trimming at a character boundary mid-word is acceptable; trimming that removes the recipe is not.
  The recipe is near the top on essentially every recipe page, which is what makes end-trimming
  the right direction.

## Dependencies

### Requires

- Unit 001 (the page this box lives on)

### Enables

- 002-extraction-prompt

## Edge Cases

| Scenario                                   | Expected Behavior                                       |
| ------------------------------------------ | ------------------------------------------------------- |
| A paste that is entirely a comment section | Extraction fails cleanly; the text is kept for retry    |
| A paste just under the cap                 | Sent whole, no trim notice                              |
| A paste of a plain recipe with no prose    | Works — surrounding narrative is optional, not required |

## Out of Scope

- Fetching a URL (see requirements, "Why paste rather than fetch")
- Any change to the proxy's limits
