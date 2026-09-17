---
id: 001-expanded-card-spans-row
unit: 003-expanded-card-layout
intent: 019-ui-correctness-fixes
status: planned
priority: should
created: '2026-09-17T15:57:07Z'
assigned_bolt: null
implemented: false
---

# Story: 001-expanded-card-spans-row

## User Story

**As a** household member browsing the catalog on a tablet or desktop
**I want** an opened card to take the full row
**So that** I'm not looking at a card beside a tall empty space

## Acceptance Criteria

- [ ] **Given** 2 or 3 columns, **When** I expand Details on a card, **Then** it spans every column and later cards continue below
- [ ] **When** I collapse it, **Then** it returns to one column
- [ ] Card order never changes and the grid does not backfill; a row the expanded card leaves may have an empty cell
- [ ] **Given** 1 column, **Then** nothing changes
- [ ] Keyboard focus stays on the Details toggle through expand and collapse
- [ ] Several cards can be expanded at once, each on its own row
- [ ] Reading order follows the markup (NFR-3)

## Technical Notes

- `SimpleGrid` at `CatalogPage.tsx:306`; `isExpanded` is local to `DinnerCard` (`:234`). The span belongs to the grid child, so the design must decide whether state lifts or the card sets its own grid column.
- Rejected at Checkpoint 1: masonry (reorders reading) and a drawer (changes how Details works)

## Dependencies

- None
