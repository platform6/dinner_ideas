---
id: 001-prep-notes-dont-split-a-line
unit: 001-line-merging
intent: 023-shopping-list-consolidation
status: draft
priority: must
created: '2026-09-24T14:56:10Z'
assigned_bolt: 080-line-merging
implemented: false
---

# Story: 001-prep-notes-dont-split-a-line

## User Story

**As a** household member shopping for the week
**I want** "chicken thighs" and "chicken thighs, cubed" to be one line
**So that** I don't have to add them up in my head in the aisle

## Acceptance Criteria

- [ ] **Given** dinners with "chicken thighs" and "chicken thighs, cubed", **Then** the list has one chicken thighs line
- [ ] **Given** "onion", "diced onion" and "onion, finely chopped", **Then** they are one line
- [ ] Case and surrounding spaces don't split a line, as today
- [ ] "onion" and "onions" stay two lines
- [ ] A name made only of prep words ("chopped") keeps its raw name as its key, never an empty string
- [ ] A set of look-alike pairs stays unmerged: "tomato sauce" / "tomato paste", "chicken broth" / "chicken thighs", "green onion" / "onion" (NFR-2)
- [ ] The prep-word list is one exported constant, like `SIMILARITY_TUNING`

## Technical Notes

- `shopping-list/aggregate.ts:19`: the key today is `normalize(name)|normalize(unit)`
- Remove prep words only as whole words: "sliced" goes, but "slice" in "slice of bread" stays
- Keep the key function separate and exported. Unit 002 needs to know which raw names went into a line

## Dependencies

- None
