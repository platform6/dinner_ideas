---
id: 002-aisle-from-household-history
unit: 002-ingredient-aisle-default
intent: 019-ui-correctness-fixes
status: planned
priority: must
created: '2026-09-17T15:57:07Z'
assigned_bolt: null
implemented: false
---

# Story: 002-aisle-from-household-history

## User Story

**As a** household member typing in an ingredient we've used before
**I want** its aisle filled in from our last use
**So that** I don't pick the same aisle for the same ingredient every time

## Acceptance Criteria

- [ ] **Given** a line's name matches, after trimming and lowercasing, an ingredient in any of the household's saved dinners, **And** the line's aisle was not chosen, **Then** the aisle is set to that ingredient's category on the **most recently created** dinner that has it
- [ ] **Given** I chose the aisle on a line, **Then** nothing overwrites it, including a later name change
- [ ] **Given** the aisle was filled from history, **When** the name changes, **Then** it refills if the new name matches, or returns to "Choose aisle" if not
- [ ] **Given** no match, **Then** the aisle stays "Choose aisle"
- [ ] **Given** an imported line, **Then** its aisle counts as chosen and history does not change it
- [ ] "chicken thighs, cubed" does **not** match "chicken thighs" (merging is intent 023)
- [ ] A filled aisle looks like a chosen one and is not announced as an error (NFR-3)
- [ ] The history is fetched at most once per form open; typing a 20-character name makes no further requests (NFR-2)

## Technical Notes

- `items` has no aisle; the source is `dinner_ingredients.category` joined to `dinners.created_at`, under existing RLS (NFR-1)
- Match with `nameKey` (`shopping-list/reorder.ts`) rather than a second copy of the rule
- Each line records where its aisle came from: unset, history, or chosen (typed or imported)

## Dependencies

- `001-no-default-aisle`: "unset" must exist before it can be filled
