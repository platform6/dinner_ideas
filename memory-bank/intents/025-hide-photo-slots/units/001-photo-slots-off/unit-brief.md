---
unit: 001-photo-slots-off
intent: 025-hide-photo-slots
phase: inception
unit_type: frontend
default_bolt_type: simple-construction-bolt
status: complete
created: '2026-10-18T20:06:52Z'
updated: '2026-10-18T20:06:52Z'
---

# Unit Brief: Photo Slots Off

## Purpose

The photo slots stay in the code and the design, but are off until dinners have photos.

## Scope

### In Scope

- One exported `SHOW_PHOTO_SLOTS` constant, `false`
- `DinnerCard`, `CookingViewPage` and `PlanPage` skip their slot while it's `false`
- A 13px cuisine icon in the cooking view's meta row while it's `false`
- The slots' entry in `memory-bank/standards/ux-guide.md`

### Out of Scope

- Photo upload, a `photo_url` column, storage
- The 38px icon tile on the hidden dinners page (`SuppressedPage`), which is not a photo slot
- `StoreConfigPage.tsx` (bolt 082's work in progress)

## Notes

- `DinnerCard.tsx:279`: a 76px `Center` holding a 30px `CuisineIcon`. The meta row at `:285-287`
  already shows a 13px icon and the cuisine name.
- `CookingViewPage.tsx:117-126`: a 44px `Center` holding a 20px `CuisineIcon`. The meta row
  (`:129-134`) shows only cook time and step count.
- `PlanPage.tsx:260`: an empty 76px `Box`, only in the `threeAcross` branch.
- No existing test checks for a slot, so the tests are new and none are rewritten.

## Stories

- `001-photo-slots-switched-off`: the three slots are not rendered, behind one constant (Must)
- `002-cooking-view-keeps-its-icon`: the cuisine icon moves into the meta row (Must)
