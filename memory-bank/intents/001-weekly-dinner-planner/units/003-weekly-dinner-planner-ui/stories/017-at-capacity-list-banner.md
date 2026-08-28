---
id: 017-at-capacity-list-banner
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: should
created: '2026-08-28T00:00:00Z'
assigned_bolt: 036-weekly-dinner-planner-ui
implemented: true
---

# Story: 017-at-capacity-list-banner

## User Story

**As a** household member picking dinners for the week
**I want** the "already have 3 picked" message to appear once, above the catalog list
**So that** I understand why cards are locked without the same sentence repeating down every un-picked card

## Context

Today, once 3 dinners are selected, `DinnerCard` renders an inline terracotta
`notice` — "Already have 3 picked — remove one first." — on **every** un-picked card
(`DinnerCard.tsx:310-314`, gated by `isLocked = selection.selectionDisabled && !selection.isSelected`).
With ~50 dinners in the catalog that is dozens of copies of one sentence. This story
moves that explanation to a single list-level banner and leaves the per-card treatment
as just the visual lock (dim + "Full" pill).

## Acceptance Criteria

- [ ] **Given** the current week's plan has exactly 3 selections and is not locked, **When** the catalog page renders, **Then** a single banner appears once, between the catalog filter row and the dinner grid, reading "You've picked 3 for this week — remove one to swap in another."
- [ ] **Given** the plan has fewer than 3 selections, **When** the catalog page renders, **Then** the banner is not shown.
- [ ] **Given** the plan is locked (shopping list already copied), **When** the catalog page renders, **Then** the banner is not shown (locked plans already surface their own state elsewhere and `selectedDinnerIds` is empty).
- [ ] **Given** the plan is at 3 selections, **When** any individual un-picked `DinnerCard` renders, **Then** it shows **no** inline "Already have 3 picked" notice — only the existing dimmed style (`opacity 0.55`) and the "Full" pick pill (locked icon + "Full" label).
- [ ] **Given** a picked (selected) `DinnerCard` at capacity, **When** it renders, **Then** it is unchanged — full opacity, "Picked" pill, still toggleable to remove.
- [ ] **Given** the banner is visible and I remove a pick (back to 2), **When** the selection state updates, **Then** the banner disappears and cards return to normal opacity in the same render cycle.
- [ ] **Given** a screen reader user, **When** the banner appears, **Then** it is announced (polite live region — e.g. Chakra `Alert` with an appropriate `status`, or `role="status"`), not silently inserted.

## Technical Notes

- **Remove** the `{isLocked && (<Box layerStyle="notice" …>Already have 3 picked — remove one first.</Box>)}` block in `src/features/dinners/components/DinnerCard.tsx` (currently lines 310-314). Keep everything else about `isLocked` in that file — the `opacity={isLocked ? 0.55 : 1}` on the card wrapper and the `PickPill` "Full"/locked-icon branch both stay.
- **Add** the banner in `src/features/dinners/components/CatalogPage.tsx`, rendered between `<CatalogFilters />` (ends ~line 102) and the loading/grid block (~line 104). Show it when `selectedDinnerIds.size >= 3`. `selectedDinnerIds` is already computed in that component (memo, lines 41-45) and is an empty set whenever the plan is missing or locked, so `>= 3` is a sufficient guard.
- Match the existing error-alert pattern already in this file (`<Alert status="…" borderRadius="field" mb={4}>` with `<AlertIcon />`), or reuse `layerStyle="notice"` for visual continuity with the message being removed — either is acceptable; pick whichever reads better against the Kitchen Table theme. Do not introduce a new bespoke component.
- Copy is a starting point; wording can be refined during the bolt as long as it states the 3-of-3 cap and the swap action.
- Tests: update `DinnerCard.test.tsx` to drop any assertion on the "Already have 3 picked" string; add a `CatalogPage.test.tsx` case that the banner shows at 3 selections and is absent at <3 and when locked.

## Dependencies

### Requires

- None — pick-3 selection flow and `selectionDisabled` already exist (bolt `004-weekly-dinner-planner-ui`).

### Enables

- None

## Edge Cases

| Scenario                                                                                                           | Expected Behavior                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A second pick's toggle mutation is mid-flight while at 2 selections (transient `selectionDisabled` on other cards) | No banner (count is still < 3); the sub-second card dim from the in-flight guard is acceptable and no longer carries any text             |
| No current plan yet (0 selections)                                                                                 | `selectedDinnerIds` is empty → no banner                                                                                                  |
| Plan locked after copying the shopping list                                                                        | `selectedDinnerIds` is empty by the existing memo guard → no banner                                                                       |
| Catalog filtered down to 0 visible dinners while at 3 picks                                                        | Banner still shows (it describes plan state, not the filtered list); the existing "No dinners match these filters." text renders below it |
| Very narrow mobile viewport                                                                                        | Banner wraps like the existing alerts; no horizontal scroll                                                                               |

## Out of Scope

- Any change to the `selectedDinnerIds.size` count badge in the page header ("{n} of 3") — it already exists and stays.
- The `PlanPage` "week is full" handling (`PlanPage.tsx` has its own `isFull`) — different page, not touched.
- Changing when a card is considered locked, or the `opacity` / "Full" pill styling.
- Animating the banner in/out beyond whatever the chosen Chakra component does by default.
