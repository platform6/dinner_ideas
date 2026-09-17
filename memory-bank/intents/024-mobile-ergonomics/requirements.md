---
intent: 024-mobile-ergonomics
phase: inception
status: draft
created: '2026-09-17T16:01:11Z'
updated: '2026-09-17T16:01:11Z'
---

# Requirements: Use it by hand on a phone

## Intent Overview

The app is used on a phone at the stove and in the store, often one-handed. Much of it was sized
and laid out for a pointer. Only the bottom tab bar meets the 44×44px touch-target minimum.

**Type**: brown-field
**Origin**: product owner's mobile review (`mobile.md`), triaged on 2026-09-17 alongside intents
019–023.

**Sequencing**: this changes button sizes app-wide, so it should come **before intent 020**'s visual
restyle, or be planned together with it, so that screens aren't restyled twice.

## Scope (from the mobile review, before Checkpoint 1)

- **Touch targets below 44×44px, across the app.** Reported at 34×34px: the header's Store setup,
  Settings and Log out icons, the week Previous/Next arrows, the shopping list's move-to-aisle icons,
  and the catalog's + and eye icons. `size="sm"` appears on 78 elements in `src/`.
- **"Remove step" is 24×24px** (`CookingStepsEditor.tsx:107`, `size="xs"`), stacked against equally
  small reorder arrows. It is a destructive action crowded next to non-destructive ones.
- **"Lock in this week" and the per-dinner remove buttons on `/plan`** are 34–36px tall.
- **Store setup's walking path truncates the one thing you need to read.** Aisle names and item
  previews end in ellipses ("Produ…", "chicken…") because four icon buttons (move up, move down,
  rename, expand) take the row.
- **The aisle-picker sheet** ("Where do you find it", `AssignSheet.tsx`) has no visible close
  button, and its last action ("Take it off the path") sits at the edge of the viewport.

## Out of scope

- The shopping-list footer and the card action menu overlapping content (intent 019, FR-6 and FR-7).
- The catalog header's mobile layout and the filter dropdown's mobile behaviour (intent 021).
- Colour, contrast and typography (intent 020).
- Cooking mode improvements (deferred, in `tasks.md`).

## Functional Requirements

_Not yet gathered. Written after Checkpoint 1._

## Non-Functional Requirements

_Not yet gathered._
