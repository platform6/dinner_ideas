---
stage: plan
bolt: 036-weekly-dinner-planner-ui
created: '2026-08-28T13:00:00Z'
---

## Implementation Plan: weekly-dinner-planner-ui — at-capacity list banner

### Objective

Consolidate the "you've already picked 3" feedback in the dinner catalog. Today
`DinnerCard` renders an inline terracotta `notice` on **every** un-picked card once the
week is full; replace that with a **single banner** above the catalog grid on
`CatalogPage`, shown only while the current plan holds 3 selections. Cards keep their
existing at-capacity treatment (dim + "Full" pick pill).

Story: `017-at-capacity-list-banner` (unit 003, priority Should, under FR-2).

### Deliverables

1. **`src/features/dinners/components/DinnerCard.tsx`** — remove the
   `{isLocked && (<Box layerStyle="notice" mb={3} fontSize="0.78125rem">Already have 3 picked — remove one first.</Box>)}`
   block (currently lines 310–314). Everything else keyed off `isLocked` stays:
   - the card wrapper `opacity={isLocked ? 0.55 : 1}` (line 241)
   - the `PickPill` branch that renders the `uiIcons.locked` icon + "Full" label and sets
     `isDisabled` (lines 200–223)
   - If removing the block leaves `Alert` / `AlertIcon` imports unused in this file, drop
     them from the import list to keep `eslint` (`no-unused-vars`) clean. (They are
     currently only used by that block — confirm during Implement.)

2. **`src/features/dinners/components/CatalogPage.tsx`** — add one banner, rendered
   between `<CatalogFilters … />` (ends ~line 102) and the `activeDinners.isLoading`
   block (~line 104), shown when `selectedDinnerIds.size >= 3`:
   - Copy: **"You've picked 3 for this week — remove one to swap in another."**
   - Use the same pattern as the two existing error alerts in this file:
     `<Alert status="info" borderRadius="field" mb={4}><AlertIcon />…</Alert>`.
     `Alert` / `AlertIcon` are already imported here. Chakra's `Alert` renders
     `role="alert"` (`status="info"` → `role="status"` is acceptable too); either
     satisfies the "announced, not silently inserted" criterion — pick whichever Chakra
     gives for `info` without extra props.
   - `selectedDinnerIds` already exists (memo, lines 41–45) and is an **empty Set**
     whenever the plan is missing or locked, so `>= 3` alone is a sufficient guard for
     all three "don't show" cases (no plan / <3 / locked).

3. **Tests** (Stage 3):
   - `DinnerCard.test.tsx` — no existing assertion references the removed string
     (verified), so nothing to delete; add a short assertion that an un-picked card with
     `selectionDisabled: true` renders **no** "Already have 3 picked" / "remove one"
     text, while still showing the "Full" pill.
   - `CatalogPage.test.tsx` — in the existing "disables picking a 4th dinner once 3 are
     already selected" harness (3-selection plan), assert the banner text is present.
     Add sibling cases: banner **absent** with 0 selections (`fetchCurrentPlan → null`)
     and **absent** when the plan is locked (`plan({ locked_at: '…', weekly_plan_selections: [3 items] })`).

### Dependencies

- None. The pick-3 flow, `selectionDisabled`, `selectedDinnerIds`, `isLocked` card
  styling, the `notice` layerStyle, and the `Alert` usage pattern all already exist
  (bolt `004-weekly-dinner-planner-ui`, Kitchen Table restyle `016-kitchen-table-ui`).
- No new packages. No state-shape, hook, `filters.ts`, or `CatalogFilterState` changes.

### Technical Approach

Pure presentation move. One JSX block deleted from `DinnerCard`, one `Alert` added to
`CatalogPage` behind a `selectedDinnerIds.size >= 3` guard. No logic, no new props —
`CatalogPage` already computes everything the banner needs. Keep the banner between the
filter row and the loading/error/grid blocks so it sits with the other page-level alerts
and doesn't reflow the grid.

Then run `npx tsc -b`, `eslint`, `vitest`, `vite build` — all must be clean, matching the
bar set by bolts `013` and `020`.

### Acceptance Criteria

- [ ] With a current unlocked plan at exactly 3 selections, `CatalogPage` renders one
      banner between the filter row and the grid reading "You've picked 3 for this week —
      remove one to swap in another."
- [ ] Banner not rendered when the plan has < 3 selections.
- [ ] Banner not rendered when the plan is locked / no plan exists (covered by the empty
      `selectedDinnerIds` Set).
- [ ] At 3 selections, no un-picked `DinnerCard` shows any inline "Already have 3 picked"
      notice — only `opacity: 0.55` and the "Full" pick pill (locked icon + "Full").
- [ ] A picked card at capacity is visually unchanged (full opacity, "Picked" pill, still
      toggleable to remove).
- [ ] Removing a pick (3 → 2) removes the banner and restores card opacity in the same
      render pass.
- [ ] Banner is a Chakra `Alert` (live region — `role="alert"`/`"status"`), not a bare
      `Box`.
- [ ] `DinnerCard.test.tsx` covers "no per-card notice at capacity"; `CatalogPage.test.tsx`
      covers banner shown at 3 / absent at <3 / absent when locked.
- [ ] `npx tsc -b`, `eslint`, `vitest` (full suite), `vite build` all clean.

### Out of Scope

- The header "{n} of 3" count badge — unchanged.
- `PlanPage`'s own `isFull` handling — different page, untouched.
- When a card is considered locked; the `opacity` / "Full" pill styling.
- Any animation of the banner beyond Chakra `Alert` defaults.
- Rewording the banner copy is fine during Implement as long as it states the 3-of-3 cap
  and the swap action.
