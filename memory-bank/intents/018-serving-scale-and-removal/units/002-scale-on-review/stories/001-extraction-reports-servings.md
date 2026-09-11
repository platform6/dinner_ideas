---
id: 001-extraction-reports-servings
unit: 002-scale-on-review
intent: 018-serving-scale-and-removal
status: planned
priority: must
created: '2026-09-11T16:24:16Z'
assigned_bolt: null
implemented: false
---

# Story: 001-extraction-reports-servings

## User Story

**As a** household member importing a recipe
**I want** the quantities the page actually printed
**So that** I can see what the recipe says before anything changes it

## Acceptance Criteria

- [ ] **Given** the extraction prompt, **When** built, **Then** it contains no instruction to
      rescale quantities
- [ ] **Given** a page stating a serving count, **When** extracted, **Then** the draft carries the
      count **as the page stated it** — "8-10" stays "8-10"
- [ ] **Given** a page stating no count, **When** extracted, **Then** the draft records that none
      was given
- [ ] **Given** any page, **When** extracted, **Then** the ingredient quantities are the source's,
      unmodified

## Technical Notes

- `servingsStated: boolean` becomes insufficient; the draft needs the stated value, not just whether
  one existed
- Removing the rescaling rule SHRINKS the system prompt, which slightly increases the paste budget
- The existing prompt tests assert the rescaling clause is present; they will need to assert its
  absence instead
