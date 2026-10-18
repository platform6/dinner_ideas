---
intent: 025-hide-photo-slots
phase: inception
status: complete
created: '2026-10-18T19:55:31Z'
updated: '2026-10-18T20:09:08Z'
---

# Requirements: Put the photo slots away for now

## Intent Overview

Intent 002 laid out photo slots in the dinner cards, the cooking view and the This week cards,
ahead of real photos. There is still no image field on the model (002, 005), so every slot ships
as an empty `paper.sunken` tile or as a tile holding the cuisine icon. Until photos exist, the
slots are taken off the screen. They stay in the design and in the code, so they come back
when photos do, without being redrawn.

**Type**: brown-field (enhancement)
**Origin**: product owner request, 2026-10-18.

### What the code shows

There are three photo slots. Each comes from intent 002 or 005:

| Where                        | File                          | Slot                      | Holds today                         |
| ---------------------------- | ----------------------------- | ------------------------- | ----------------------------------- |
| Catalog dinner card          | `DinnerCard.tsx:279`          | 76×76px tile              | Cuisine icon, 30px (003 Finding 12) |
| Cooking view, collapsed row  | `CookingViewPage.tsx:117-126` | 44×44px thumb             | Cuisine icon, 20px                  |
| This week, three-across card | `PlanPage.tsx:260`            | Full-width 76px-tall tile | Nothing                             |

- **The dinner card's tile is not the only cuisine icon.** The meta row under the title also
  shows a 13px cuisine icon and the cuisine name (`DinnerCard.tsx:285-287`), so hiding the tile
  loses no information.
- **In the cooking view, the tile is the only cuisine icon.** The meta row shows cook time and
  step count only.
- **The This week tile exists only in the three-across layout.** The single-column row has none.
- **Not a photo slot:** the 38px tile in `SuppressedPage.tsx:70-79` holds the suppress icon. It
  belongs to the hidden-dinners list's own design and is out of scope.

---

## Functional Requirements

### FR-1: Photo slots are not rendered

- **Description**: None of the three slots in the table above appears on any screen at any
  breakpoint.
- **Acceptance Criteria**:
  - No photo-slot element is in the DOM. Hiding it with CSS does not count, because a hidden tile
    would still take space.
  - The title and meta text beside each slot move into the slot's space and keep their alignment.
  - The This week three-across card goes straight from the badge and remove row to the name and
    meta.
- **Priority**: Must

### FR-2: Cuisine icons stay

- **Description**: Every surface that shows a cuisine icon today still shows one with the slots
  off.
- **Acceptance Criteria**:
  - Catalog dinner card: the 13px cuisine icon and cuisine name in the meta row stay as they are.
    No icon is added.
  - Cooking view row: a small cuisine icon (meta-row size, 13px) sits inline in the meta row,
    before the cook time.
  - Turning the switch on (FR-3) puts back the tiles and today's large icons, and removes the
    inline cooking-view icon added here, so there is no duplicate.
- **Priority**: Must

### FR-3: One code constant brings the slots back

- **Description**: The slot markup stays in the code behind one exported boolean constant
  (working name `SHOW_PHOTO_SLOTS`, set to `false`), shared by all three components.
- **Acceptance Criteria**:
  - The constant is defined in one place and imported by `DinnerCard`, `CookingViewPage` and
    `PlanPage`.
  - Setting it to `true` restores today's rendering of all three slots.
  - Tests cover both values.
  - Changing it needs a code change and a deploy. There is no environment variable and no
    setting in the app.
- **Priority**: Must

### FR-4: The design still records the slots

- **Description**: The design record keeps the slots and says they are switched off until photos
  exist, so later work doesn't treat them as removed.
- **Acceptance Criteria**: `memory-bank/standards/ux-guide.md` lists each slot (where it is,
  its size, and that it holds the cuisine icon or nothing), names the constant, and says it is
  off.
- **Priority**: Must

---

## Non-Functional Requirements

| Requirement           | Target                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| No schema change      | Display only. No migration and no API change.                                                               |
| No layout regressions | Cards and rows keep their spacing at phone (390px) and desktop widths.                                      |
| Existing tests        | Tests that assert a slot is present are updated to match whichever value the constant has, and not deleted. |

---

## Constraints

- Display change only. No photo upload, `photo_url` column or storage work (that is the future
  intent that turns the constant back on).
- Bolt 082 (intent 023) has uncommitted work in `StoreConfigPage.tsx`. This intent does not touch
  that file.

---

## Assumptions

| Assumption                                                                    | Risk if Invalid                            | Mitigation                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| The catalog card's meta-row icon is enough, so the 30px tile icon isn't moved | The card looks bare without the large icon | Check at phone width during construction, then raise it with the product owner |

---

## Decisions (Checkpoint 1, 2026-10-18)

| Question                           | Decision               |
| ---------------------------------- | ---------------------- |
| Are the three slots the full list? | Yes                    |
| What happens to the cuisine icons? | They stay              |
| How is the switch controlled?      | A constant in the code |
