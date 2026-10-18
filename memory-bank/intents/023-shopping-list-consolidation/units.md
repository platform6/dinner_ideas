---
intent: 023-shopping-list-consolidation
phase: inception
status: units-defined
updated: '2026-09-24T14:56:10Z'
---

# Units: Shopping List Consolidation

## Decomposition Principle

Merging lines is a pure function over data the list already has, so it gets its own unit and can be
tested without a screen. Giving a merged line its aisle is where the merge meets the database's
identity (`items.name_key`). That's the riskiest part, so it gets its own unit and bolt. The empty
aisle toggle is on a different page and shares nothing with either, so it stands alone and is
cuttable.

## Unit Summary

| Unit                     | Name               | Requirements                   | Depends on | Cuttable |
| ------------------------ | ------------------ | ------------------------------ | ---------- | -------- |
| `001-line-merging`       | Line Merging       | FR-1, FR-2, FR-3, NFR-2, NFR-3 | none       | No       |
| `002-merged-line-aisle`  | Merged Line Aisle  | FR-4                           | 001        | No       |
| `003-empty-aisle-toggle` | Empty Aisle Toggle | FR-5                           | none       | **Yes**  |

NFR-1 (no schema change) applies to every unit.

**Units 001 and 002 ship together or not at all.** Merging without FR-4 would silently lose any aisle
the household had set on a prep-note variant.

## Unit 001: Line Merging

**Owns**: the merge key, the per-unit amounts, the plain label, and each line's list of source names.
That covers `aggregate.ts`, `format.ts` and the `ShoppingListItem` type.

**Risk**: a false merge. The prep-word list is tuned for precision (NFR-2), and a test set of
look-alike pairs must stay unmerged.

## Unit 002: Merged Line Aisle

**Owns**: choosing each line's registry item (FR-4), and everything that depends on it: sort position,
the aisle sheet, and the key that stores check marks.

**Why its own unit**: today a line and its registry item share one key, `nameKey(line.name)`, used in
`reorder.ts` and `ShoppingListPage`. After the merge that's no longer true, and every place that
relied on it has to change together.

**Risk**: a line landing in "not placed" when one of its sources had an aisle. The test for exactly
that case is the proof.

## Unit 003: Empty Aisle Toggle

**Owns**: hiding empty aisles in Store setup's walking path, the toggle, and keeping reorder correct
while some aisles are hidden.

**Why cuttable**: FR-5 is `Should`, and empty aisles can already be deleted.

**Risk**: reorder. "Move earlier" on a visible aisle must land before the previous _visible_ aisle.
Swapping with a hidden one would look like nothing happened. `reorder_location` already accepts any
target position, so this needs no schema change.

## Requirement-to-Unit Mapping

- **FR-1**: prep notes stripped from the merge key → `001-line-merging`
- **FR-2**: one amount per unit → `001-line-merging`
- **FR-3**: plain label → `001-line-merging`
- **FR-4**: merged line keeps its aisle → `002-merged-line-aisle`
- **FR-5**: empty aisles hidden behind a toggle → `003-empty-aisle-toggle`
- **NFR-1**: no schema change → all units
- **NFR-2**: precision over recall → `001-line-merging`
- **NFR-3**: same input, same list → `001-line-merging`
