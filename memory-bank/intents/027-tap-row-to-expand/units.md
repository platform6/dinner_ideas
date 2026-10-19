---
intent: 027-tap-row-to-expand
phase: inception
status: units-defined
updated: '2026-10-19T10:20:41Z'
---

# Units: Tap Row to Expand

## Decomposition Principle

One component, three small requirements, and one release. There's nothing to split, so this is one
unit, one story and one bolt.

## Unit Summary

| Unit                  | Name            | Requirements     | Depends on | Cuttable |
| --------------------- | --------------- | ---------------- | ---------- | -------- |
| `001-tap-bar-to-open` | Tap Bar to Open | FR-1, FR-2, FR-3 | none       | No       |

## Unit 001: Tap Bar to Open

**Owns**: the click target on This week's phone rows and desktop cards, and its hover style.

**Risk**: low. Two things to watch:

- **Bubbling**: the expand and remove buttons sit inside the bar. Without stopping propagation,
  the expand icon would toggle twice (no change) and remove would also toggle.
- **Desktop card**: its top part is three siblings today (the badge row, the optional photo slot,
  and the name and meta). They need one clickable wrapper that leaves the details outside it.

## Requirement-to-Unit Mapping

- **FR-1**: tapping the bar toggles the dinner → `001-tap-bar-to-open`
- **FR-2**: the buttons and details don't double up → `001-tap-bar-to-open`
- **FR-3**: the bar looks tappable → `001-tap-bar-to-open`
- **NFRs** (accessible, front end only and tested) → `001-tap-bar-to-open`
