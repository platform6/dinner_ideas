---
id: 002-sheet-and-checks-follow-the-line
unit: 002-merged-line-aisle
intent: 023-shopping-list-consolidation
status: draft
priority: must
created: '2026-09-24T14:56:10Z'
assigned_bolt: 081-merged-line-aisle
implemented: false
---

# Story: 002-sheet-and-checks-follow-the-line

## User Story

**As a** household member shopping
**I want** to move a merged line to another aisle and have my check marks stay put
**So that** merged lines behave like every other line

## Acceptance Criteria

- [ ] Tapping a merged line opens "Where do you find it" for the registry item story 001 chose
- [ ] Moving it there re-sorts the merged line into the new aisle
- [ ] A checked merged line stays checked after the move
- [ ] A checked line stays checked when the list rebuilds from the same dinners

## Technical Notes

- `itemByNameKey` in `ShoppingListPage.tsx` looks up by the line's name. Switch it to the key resolved in story 001
- Check marks are keyed by `category-name-unit` today, and a merged line can have several units. Key them by the line's merge key instead. The existing test `preserves check state across a move` must still pass

## Dependencies

- `001-merged-line-finds-its-aisle`
