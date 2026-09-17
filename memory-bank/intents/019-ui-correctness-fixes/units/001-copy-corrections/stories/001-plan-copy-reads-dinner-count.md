---
id: 001-plan-copy-reads-dinner-count
unit: 001-copy-corrections
intent: 019-ui-correctness-fixes
status: planned
priority: must
created: '2026-09-17T15:57:07Z'
assigned_bolt: null
implemented: false
---

# Story: 001-plan-copy-reads-dinner-count

## User Story

**As a** household member who plans 5 dinners a week
**I want** the plan page to say 5 wherever it gives a count
**So that** I can trust the other numbers on the page

## Acceptance Criteria

- [ ] **Given** `dinners_per_week` is N and the lock action is shown, **Then** its help text reads "Locks these N dinners and adds them to your history. You can still shop your list either way."
- [ ] **Given** N = 1, **Then** it reads "Locks this dinner and adds it to your history. You can still shop your list either way."
- [ ] **Given** the current week holds N of N picks, **Then** the message reads "All N dinners picked. Your shopping list is ready."; for N = 1, "Your dinner is picked. Your shopping list is ready."
- [ ] **Given** N ≠ 3, **Then** neither "3" nor "three" appears in `/plan` copy
- [ ] Tests assert the **rendered** text for N = 1, 3 and 5
- [ ] `DinnerCard.tsx` doc comments that say "3 dinners" say `dinners_per_week` instead

## Technical Notes

- The strings are `PlanPage.tsx:131` and `:274`; `dinnersPerWeek` is already in scope (`:41`)
- The existing tests pass with N = 3, which is why these survived intent 015. Cover N ≠ 3.

## Dependencies

- None
