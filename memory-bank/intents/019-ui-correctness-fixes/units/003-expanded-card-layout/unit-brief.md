---
unit: 003-expanded-card-layout
intent: 019-ui-correctness-fixes
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-09-17T15:57:07Z'
updated: '2026-09-17T15:57:07Z'
---

# Unit Brief: Expanded Card Layout

## Purpose

An open card never sits beside a tall empty space.

## Scope

### In Scope

- The expanded card spans every column at 2 and 3 columns
- Collapsing returns it to one column
- No reordering or backfill; focus stays on the toggle

### Out of Scope

- Changing what Details contains
- A masonry layout or a drawer (rejected at Checkpoint 1)

## Notes

`SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }}` (`CatalogPage.tsx:306`) stretches rows to the tallest card. `isExpanded` lives inside `DinnerCard`, but the span belongs to the grid item.

## Stories

- `001-expanded-card-spans-row`: An expanded card spans its row (Should)
