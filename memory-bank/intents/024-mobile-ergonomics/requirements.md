---
intent: 024-mobile-ergonomics
phase: inception
status: complete
created: '2026-09-17T16:01:11Z'
updated: '2026-09-18T13:15:12Z'
---

# Requirements: Use it by hand on a phone

## Intent Overview

The app is used on a phone at the stove and in the store, often one-handed. Much of it is sized for
a pointer. Only the bottom tab bar meets the 44×44px touch-target minimum both Apple and Google
recommend.

**Type**: brown-field
**Origin**: product owner's mobile review, triaged on 2026-09-17 alongside intents 019–023.

**Sequencing**: this changes control sizes app-wide, so it comes **before intent 020**'s visual
restyle, or is planned with it, so screens aren't restyled twice.

### What the code shows

- **The sizes are in one place.** `theme/index.ts` defines `Button` sizes `md: 44px`, `sm: 34px`,
  `lg: 52px`. `IconButton` inherits them. Its comment already claims that every tappable control is
  at least 44px tall on a phone, which is not true today.
- **`sm` is the app's default control size**: 78 uses in `src/`, against 11 `lg`, 4 `md` and 4 `xs`.
  So the review's 34×34px measurements are the theme's `sm`, everywhere at once.
- **`xs` has no theme entry**, so it falls back to Chakra's 24px. Its four uses are the three
  cooking-step buttons (up, down, remove) and one in `LocationRow`.
- **"Remove step" sits in the same cluster as the reorder arrows** (`CookingStepsEditor.tsx:88-107`),
  a destructive action between two harmless ones, all 24px.
- **Store setup rows already truncate.** `LocationRow` renders the aisle name and item preview with
  `noOfLines={1}` beside a count and four icon buttons in one row, so the name is what gives way.
- **The aisle sheet is a Chakra `Drawer`** (`AssignSheet.tsx:97`), so Escape, the overlay and the
  focus trap already work; what it lacks is a visible close control, and its last action
  ("Take it off the path") is the last thing in a body that can scroll.
- **The tab bar is already right**: each item is `minW`/`minH` 44px (`Layout.tsx`).

## Decisions taken at Checkpoint 1 (2026-09-17)

1. **Controls grow on phones only.** The theme's `sm` becomes 44px at phone width and stays 34px at
   md+. Honest sizes rather than invisible hit areas, which would overlap in tight rows.
2. **"Remove step" grows and moves away from the reorder arrows**, so a mis-tap cannot delete a
   step. No confirmation dialog: removing one blank-ish step is not worth a prompt on every edit.
3. **Store setup: the name comes first.** On phones the aisle name and preview get the row's full
   width, and the actions move to their own line below. Nothing is hidden.

## Functional Requirements

### FR-1: Every control is at least 44×44px on a phone

- **Description**: At phone widths, each interactive control is at least 44px in both directions.
  At md+ the current sizes stay, since a pointer is precise and desktop density matters.
- **Acceptance Criteria**:
  - The theme's `sm` size is 44px high with a 44px minimum width below `md`, and 34px at `md` and
    above. `lg` (52px) and `md` (44px) are unchanged.
  - A `sm` `IconButton` is at least 44×44px at phone width: it is square, so width follows height.
  - Measured in a real browser at phone width: the header's Store setup, Settings and Log out
    icons; the week Previous/Next arrows; the shopping list's move-to-aisle buttons; the catalog's
    add and "Not interested" icons; "Lock in this week" and the plan's per-dinner remove buttons.
  - At 1024px those same controls still measure 34px.
  - Text inside a `sm` control does not change size; only the box grows.
- **Priority**: Must

### FR-2: Removing a cooking step is not a mis-tap away

- **Description**: The "Remove step" button reaches the same minimum and is visually separated from
  the reorder arrows.
- **Acceptance Criteria**:
  - At phone width the remove button is at least 44×44px, as are the two reorder arrows.
  - Remove is separated from the reorder pair — by position in the row, not by colour alone.
  - Its accessible name still names the step it removes ("Remove step 2").
  - Removing a step still renumbers the rest with no gap, as today.
  - No confirmation step is added.
- **Priority**: Must

### FR-3: A Store setup row shows its aisle name in full on a phone

- **Description**: On phones the walking-path row gives the aisle name and item preview the full
  width, and puts the row's actions on their own line.
- **Acceptance Criteria**:
  - At phone width no aisle name is cut short by the actions. A name too long for the row still
    wraps or truncates on its own terms, not because four buttons take the space.
  - The item preview keeps its one line.
  - Move earlier, move later, rename and expand all remain reachable in the row, each meeting FR-1.
  - Tapping the row still expands it, and the actions still don't trigger that (they stop the tap
    today).
  - At md+ the row is unchanged.
- **Priority**: Must

### FR-4: The aisle sheet can be closed, and its last action is reachable

- **Description**: The "Where do you find it" sheet gets a visible close control, and its bottom
  action isn't flush with the edge of the screen.
- **Acceptance Criteria**:
  - The sheet shows a close control that meets FR-1 and is labelled for screen readers.
  - Escape, the overlay tap and the focus trap keep working, as Chakra's drawer already provides.
  - "Take it off the path", when shown, is fully visible above the bottom edge without the sheet
    being scrolled, at a phone height of 667px (an iPhone SE) with the longest suggestion list the
    fixtures produce.
  - Closing by the new control returns focus where Escape already returns it.
- **Priority**: Should

## Non-Functional Requirements

### NFR-1: No schema change

- Nothing here adds or alters a table, column, function or policy. It is layout, sizing and one
  control.

### NFR-2: md+ does not move

- Every screen this touches is checked at 1024px before and after. Desktop density is deliberate
  (intent 005), and this intent is not a restyle.

### NFR-3: Measured, not asserted

- jsdom has no layout, so "44px" cannot be proven in a unit test. Sizes are pinned where they are
  defined (the theme) and **measured in a real browser** at phone width on each screen named in
  FR-1 to FR-4. The browser check is part of the bolt, not optional.

## Assumptions, confirmed at Checkpoint 2 (2026-09-18)

1. **"Phone width" means below Chakra's `md` (768px)**, the same breakpoint the app already uses to
   switch between the tab bar and the rail.
2. **`lg` and `md` controls are already fine** and are not touched.
3. **FR-4 is `Should`** and can be cut without affecting the rest.

## Out of scope

- Colour, contrast, typography and visual hierarchy (intent 020).
- The catalog header's mobile layout and the filter dropdown (intent 021).
- The shopping-list footer and the card action menu overlaps (intent 019, shipped in v0.16.0).
- Cooking mode improvements (deferred, in `tasks.md`).
