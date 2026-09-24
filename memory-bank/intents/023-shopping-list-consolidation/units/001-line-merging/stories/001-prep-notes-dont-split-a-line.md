---
id: 001-prep-notes-dont-split-a-line
unit: 001-line-merging
intent: 023-shopping-list-consolidation
status: complete
priority: must
created: '2026-09-24T14:56:10Z'
assigned_bolt: 080-line-merging
implemented: true
---

# Story: 001-prep-notes-dont-split-a-line

## User Story

**As a** household member shopping for the week
**I want** "chicken thighs" and "chicken thighs, cubed" to be one line
**So that** I don't have to add them up in my head in the aisle

## Acceptance Criteria

- [ ] **Given** dinners with "chicken thighs" and "chicken thighs, cubed", **Then** the list has one chicken thighs line
- [ ] **Given** "onion", "onion, diced" and "onion, finely chopped", **Then** they are one line
- [ ] Case and surrounding whitespace don't split a line, as today
- [ ] "onion" and "onions" stay two lines
- [ ] A prep word before the name is kept: "diced tomatoes" and "tomatoes" stay two lines
- [ ] A name that is only a note (", diced") keeps its raw name as its key, never an empty string
- [ ] Look-alike pairs stay unmerged: "diced tomatoes" / "tomatoes", "shredded carrots" / "carrots", "tomato sauce" / "tomato paste", "chicken broth" / "chicken thighs", "green onion" / "onion" (NFR-2)

## Technical Notes

- `shopping-list/aggregate.ts:19`: the key today is `normalize(name)|normalize(unit)`
- **Changed in bolt 080 (product owner, 2026-09-24)**: only the note after the first comma is removed. The approved rule also removed prep words anywhere in the name, which merged canned diced tomatoes into fresh tomatoes in the household's catalog. The `PREP_WORDS` constant this story asked for went with it
- Keep the key function separate and exported. Unit 002 needs to know which raw names went into a line

## Dependencies

- None
