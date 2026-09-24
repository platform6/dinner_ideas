---
id: 003-plain-label
unit: 001-line-merging
intent: 023-shopping-list-consolidation
status: draft
priority: must
created: '2026-09-24T14:56:10Z'
assigned_bolt: 080-line-merging
implemented: false
---

# Story: 003-plain-label

## User Story

**As a** household member shopping
**I want** the line to read "chicken thighs", not "chicken thighs, cubed"
**So that** the list is about groceries, not cooking

## Acceptance Criteria

- [ ] A merged line's label has no prep notes, and uses the capitalization of its first appearance
- [ ] The line doesn't list which dinners it's for, or which prep notes were merged
- [ ] A line that didn't merge with anything looks as it does today, apart from losing its prep notes
- [ ] The cooking view still shows "chicken thighs, cubed"

## Technical Notes

- The label is the raw name with the same words removed as the key, but with its original capitalization
- Keep the raw source names on the line for unit 002, but don't display them

## Dependencies

- `001-prep-notes-dont-split-a-line`
