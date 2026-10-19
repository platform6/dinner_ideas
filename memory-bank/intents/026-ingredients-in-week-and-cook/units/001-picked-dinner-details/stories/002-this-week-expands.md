---
id: 002-this-week-expands
unit: 001-picked-dinner-details
intent: 026-ingredients-in-week-and-cook
status: complete
priority: must
created: '2026-10-18T22:15:19Z'
assigned_bolt: 084-picked-dinner-details
implemented: true
---

# Story: 002-this-week-expands

## User Story

**As a** household member planning the week
**I want** to open a picked dinner on This week
**So that** I can see its ingredients and steps without going back to the catalog

## Acceptance Criteria

- [ ] Every picked dinner, phone row or desktop card, has a button with `aria-expanded`, labelled `Expand {name}` / `Collapse {name}`, using the Cook tab's expand and collapse icons
- [ ] It's there on the current week (locked or not) and on past weeks
- [ ] Expanded, it shows "Ingredients" with `IngredientList`, then "Steps" with `StepList`. No tags
- [ ] Details load only on expand, through `useDinnerFullDetails(id, true)`. A small spinner shows while loading, and "Couldn’t load details for this dinner." on failure
- [ ] Desktop (1280px in tests): one expand opens every card and one collapse closes them all
- [ ] Phone: each row opens on its own, and several can be open at once
- [ ] Everything is collapsed on load and after changing week
- [ ] On the current unlocked week, the remove button and the expand button don't trigger each other
- [ ] At 390px the name, meta, remove and expand controls fit on the row without the name being squeezed to nothing

## Technical Notes

- Open state: a `Set` of selection ids for phone (like the Cook tab) and one boolean for desktop.
  Reset both when `offset` changes.
- The expanded content can be one small component that takes `dinnerId` and calls
  `useDinnerFullDetails`, so each card only fetches when it's open.
- Check at 390px in a same-origin iframe, because Chrome's resize doesn't narrow the viewport.

## Dependencies

- `001-shared-ingredient-and-step-lists`
