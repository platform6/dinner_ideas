---
id: 004-needs-review-section
unit: 002-store-placement-control
intent: 013-placement-edit-control
status: complete
priority: must
created: '2026-09-05T17:30:00Z'
assigned_bolt: 057-store-placement-control
implemented: true
---

# Story: 004-needs-review-section

## User Story

**As a** household member who just imported ten recipes
**I want** to see only the groceries nobody has checked yet
**So that** the two or three that landed in the wrong spot surface, instead of hiding among a
hundred I already trust

## Acceptance Criteria

- [ ] **Given** the store page, **When** the section renders, **Then** it lists every Item with
      `reviewed_at is null`, **regardless of placement state** — an inherited item is exactly
      what needs checking.
- [ ] **Given** a row, **When** shown, **Then** it names the item, the stop it currently
      resolves to, and how it got there — so the question being asked is "is that right?", not
      "where does this go?".
- [ ] **Given** a row, **When** the user accepts the current stop, **Then** the item is marked
      reviewed and the row leaves the list. No placement row is written — accepting the category
      default is a valid answer.
- [ ] **Given** a row, **When** the user moves it instead, **Then** the assign flow opens, the
      placement is written, and the item is marked reviewed by the same action.
- [ ] **Given** no unreviewed items, **When** the section renders, **Then** the empty state is
      calm and vacuously true — "Nothing new to check." No red, no warning styling.
- [ ] **Given** the section replaces the old one, **When** built, **Then** the in-recipe
      narrowing (`useInRecipeNameKeys` / `fetchInRecipeNameKeys`) is **removed** unless there is
      a stated reason to keep it — a review queue has no use for "used in at least one recipe",
      and that narrowing is half of why the old section was empty.

## Technical Notes

- This story re-scopes `UnassignedSection.tsx` rather than deleting it. The section was never
  the wrong idea; `unassigned` was the wrong population. Renaming the component to match its new
  meaning is expected.
- The old section's search widened past the default scope but stayed inside `unassigned`. The
  all-groceries list (story 001) now owns "find anything"; this section owns "what have I not
  looked at". Keeping those two jobs in separate surfaces is the point.
- Accepting a stop must be one tap. If review costs more than a tap per item, an import of ten
  recipes becomes a chore and the queue gets ignored.

## Dependencies

### Requires

- Unit 001 stories 001 and 002 (the column and the write path)
- 001-all-groceries-list (shares the resolution query and the row presentation)

### Enables

- 005-similarity-suggestion-on-review

## Edge Cases

| Scenario                                                       | Expected Behavior                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A brand-new household with no items                            | "Nothing new to check." — vacuously true, not an error                         |
| An item is reviewed in another tab                             | It disappears on the next resolution refetch; no stale-action error            |
| A registry orphan that is also unreviewed                      | Listed, with no stop; the move action still works                              |
| Every item is unreviewed (e.g. a fresh import of many recipes) | The list is long; it must stay scrollable and each row still one tap to accept |

## Out of Scope

- Bulk "accept all" — deliberately omitted; the queue exists to be looked at
- Any Claude-assisted suggestion — that escalation is intent 014
