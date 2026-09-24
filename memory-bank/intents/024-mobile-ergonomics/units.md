---
intent: 024-mobile-ergonomics
phase: inception
status: units-defined
updated: '2026-09-18T13:10:36Z'
---

# Units: Mobile Ergonomics

## Decomposition Principle

One unit changes a number in the theme and is felt everywhere. The other two change the shape of a
specific row or panel. Splitting them that way keeps the app-wide change on its own, where it can be
checked screen by screen, and keeps each layout rework in the one component it belongs to.

## Unit Summary

| Unit                    | Name              | Requirements | Depends on | Cuttable |
| ----------------------- | ----------------- | ------------ | ---------- | -------- |
| `001-touch-target-size` | Touch Target Size | FR-1, NFR-2  | none       | No       |
| `002-dense-row-layouts` | Dense Row Layouts | FR-2, FR-3   | 001        | No       |
| `003-aisle-sheet-close` | Aisle Sheet Close | FR-4         | 001        | **Yes**  |

NFR-1 (no schema change) and NFR-3 (measured in a browser) apply to every unit.

## Unit 001: Touch Target Size

**Owns**: the theme's `sm` size becoming 44px below `md`, and the screen-by-screen check that the
controls named in FR-1 actually grew without anything else moving.

**Why it is first**: 78 controls inherit this size, including the ones the other two units rework.
Doing it first means those units lay out buttons that are already the right size, instead of being
redone.

**The risk it carries**: reflow. A taller control in a row built for 34px can wrap, stretch a card,
or push a header onto two lines. The screens in FR-1, plus the two in units 002 and 003, are each
looked at on a phone and at 1024px.

## Unit 002: Dense Row Layouts

**Owns**: the cooking-step row, where a destructive button sits between two harmless ones, and the
Store setup walking-path row, where four icon buttons squeeze out the aisle name.

**Why together**: the same shape of problem — a row whose icon buttons crowd what the user came to
read or press — and both are re-flows of a single component, made worse by unit 001's larger
buttons. They share no code, so either can be dropped if the other runs long.

**The risk it carries**: the Store setup row is a tap target itself (it expands), with buttons
inside that must not trigger it. That behaviour exists today and must survive the re-flow.

## Unit 003: Aisle Sheet Close

**Owns**: a visible close control on the "Where do you find it" sheet, and making sure its last
action is not flush with the bottom of the screen.

**Why cuttable**: FR-4 is `Should`. The sheet already closes on Escape and on a tap outside; this
makes that obvious rather than possible.

**The risk it carries**: the theme's `CloseButton` size `sm` is 16px, so the obvious component is
the wrong one here. Whatever is used must meet FR-1.

## Requirement-to-Unit Mapping

- **FR-1**: 44×44px on a phone → `001-touch-target-size`
- **FR-2**: removing a step is not a mis-tap away → `002-dense-row-layouts`
- **FR-3**: a Store setup row shows its aisle name → `002-dense-row-layouts`
- **FR-4**: the aisle sheet closes visibly → `003-aisle-sheet-close`
- **NFR-1**: no schema change → all units
- **NFR-2**: md+ does not move → `001` primarily, checked in every unit
- **NFR-3**: measured in a browser → all units
