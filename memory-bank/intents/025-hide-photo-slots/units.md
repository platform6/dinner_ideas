---
intent: 025-hide-photo-slots
phase: inception
status: units-defined
updated: '2026-10-18T20:06:52Z'
---

# Units: Hide Photo Slots

## Decomposition Principle

There is one constant, three components that read it, and one paragraph in the design guide. Split
up, the units would share the constant and nothing else, and none of them is worth shipping on its
own. So this is one unit and one bolt.

## Unit Summary

| Unit                  | Name            | Requirements           | Depends on | Cuttable |
| --------------------- | --------------- | ---------------------- | ---------- | -------- |
| `001-photo-slots-off` | Photo Slots Off | FR-1, FR-2, FR-3, FR-4 | none       | No       |

## Unit 001: Photo Slots Off

**Owns**: the `SHOW_PHOTO_SLOTS` constant, the three slots that read it, the cooking view's inline
cuisine icon, and the slots' entry in `ux-guide.md`.

**Risk**: low. The one thing to watch is a row's layout once its slot is gone, especially the This
week three-across card, which is a vertical stack.

## Requirement-to-Unit Mapping

- **FR-1**: photo slots are not rendered → `001-photo-slots-off`
- **FR-2**: cuisine icons stay → `001-photo-slots-off`
- **FR-3**: one code constant brings them back → `001-photo-slots-off`
- **FR-4**: the design still records the slots → `001-photo-slots-off`
- **NFRs** (no schema change, no layout regressions, tests updated, not deleted) → `001-photo-slots-off`
