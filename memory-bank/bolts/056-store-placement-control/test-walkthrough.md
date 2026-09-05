---
stage: test
bolt: 056-store-placement-control
created: '2026-09-05T20:05:00Z'
---

## Test Report: 002-store-placement-control (bolt 056)

### Summary

| Check            | Result                                |
| ---------------- | ------------------------------------- |
| Unit + component | ✅ **300 / 300** (32 files) — was 290 |
| Type check       | ✅ `tsc -b` clean                     |
| Lint             | ✅ `eslint src` clean                 |
| Production build | ✅ `built in 4.79s`                   |

Eight new cases, all in `StoreConfigPage.test.tsx` (25 → 27 in that file, plus the two
`LocationRow` cases). Tested at the page level rather than per component, because what broke on
production was not a component in isolation — it was whether the page offers any reachable route
into the assign flow.

### Test Files

- [x] `src/features/store-config/components/StoreConfigPage.test.tsx` — extended with three
      describe blocks: reaching every grocery, moving a category, and a stop listing what it
      holds
- [x] The same file's api mock, **completed** — see Issues

### The fixtures follow production's shape

Every new case builds items that are **`inherited`**, because that is what all 121 groceries in
production are. Intent 010's suites passed 290/290 while the feature was unreachable precisely
because their fixtures constructed `unassigned` items directly — a state the data model cannot
produce, since `dinner_ingredients.category` is NOT NULL over five values and the cutover placed
all five.

Story 006 (bolt 057) owns that rule formally. It is applied here already because this is the
bolt where a convenient fixture would have hidden the very defect being fixed.

### Acceptance Criteria Validation

**Story 001 — all groceries**

- ✅ Lists every item in every placement state — asserted with an all-`inherited` fixture, the
  case the old section could not show
- ✅ Search matches case- and whitespace-insensitively (`nameKey`, same rule as `reorder.ts`)
- ✅ Row shows name, stop, and provenance — `Bakery · follows Grains` vs
  `Aisle 3 · you chose this`
- ✅ Row opens `AssignSheet` — asserted by the sheet's "Where do you find it" heading
- ✅ Alphabetical; search narrows without reordering
- ✅ **`spaghetti` is findable and movable** — the concrete thing that was impossible, now a test
- ⚪ A registry orphan renders neutrally — not asserted here; no orphan exists in this
  household, and manufacturing one would be the same fixture dishonesty this bolt is guarding
  against. Covered structurally: the row renders `No spot yet` from `placementLine`

**Story 002 — category move**

- ✅ All five categories listed, including one sitting nowhere
- ✅ Picking a stop calls `setCategoryPlacement(store, 'Pantry', 'loc-3')`
- ✅ "Take it off the path" offered **only** for a category that has a stop, and calls
  `unsetCategoryPlacement`
- ✅ Moving **replaces** rather than adds — verified at the data layer (below), which is where
  the unique constraint actually lives
- ✅ Inheriting items move, explicitly-placed items do not — verified at the data layer
- ⚪ Shopping list re-sorts — bolt 058's surface; the resolution query invalidation that drives
  it is in `useCategoryMutation`

**Story 003 — uncapped rows**

- ✅ An expanded stop shows **all nine** of nine items; no `+ N more`
- ✅ Collapsed count equals the true total
- ✅ Every listed item offers the move action
- ✅ A placed category appears as an entry **distinct from the items** — "Everything in Produce"
  above the item list, with a "Move all" action that opens that category's picker
- ⚪ 39 items smooth on mobile — not machine-assertable; the cap removal is the change, and the
  NFR bar is documented

### The regression test was verified to actually fail

A test that passes against the bug is worse than no test. Before accepting the suite, the cap was
temporarily reinstated (`items.slice(0, 4)`) and the suite re-run:

```
× shows EVERY item at a stop, past the four the old cap allowed
  Tests  1 failed | 26 passed (27)
```

Exactly one case failed, and it was the right one. The cap was then restored to `items.map` and
the full suite returned to green. **This is the check intent 010's suites never got** — they were
green against code whose feature was unreachable, and nobody had reason to doubt them.

### Data-layer verification (Stage 2, recorded here for completeness)

Run directly against the local stack carrying production's shape:

| Setup                                  | 7 `Dairy` items inherited, 1 (`butter`) explicitly placed at `Pantry`        |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Action                                 | Move `Dairy` → `Produce` via the same upsert `setCategoryPlacement` performs |
| Inherited items                        | all 7 moved to `Produce`                                                     |
| `butter`                               | **stayed at `Pantry`** — the resolution order holds                          |
| `category_placements` rows for `Dairy` | **1** — replaced, not added                                                  |

This is FR-2's central criterion, proved where the constraint lives rather than where a mock
would agree with itself.

### Issues Found

**1 — The page test's api mock was incomplete, and it was masking a state.** Adding
`fetchCategoryPlacements` to `api.ts` without stubbing it left React Query logging _"Query data
cannot be undefined"_ on every render. The component was unaffected (`?? []`), so nothing failed
— which is the problem: the suite was quietly exercising a state the app never reaches. Fixed by
stubbing all three new functions. The fixture deliberately leaves `Pantry` **unplaced**, so at
least one test sees a category with nowhere to sit.

**2 — Two new assertions were ambiguous on first run**, and both were the test's fault rather
than the code's:

- `Produce` matches both a stop on the path and a category. Re-asserted through each category's
  `Move X` button, which is unique.
- Two `Grains` items share the line `Bakery · follows Grains`. Re-asserted with `findAllByText`
  and an explicit count of 2.

Worth recording because the first is a live ambiguity in the UI too: a user reading "Produce"
in the category section and "Produce" on the path is looking at two different things with one
name. It is not wrong — the category genuinely sits at the like-named stop — but it is worth
watching when bolt 057 adds another section.

### A criterion I initially missed

Story 003's third acceptance criterion — _a placed category appears as an entry distinct from the
individual items_ — was **not built** in the first pass, and worse, this report's first version
silently omitted it from the validation list rather than marking it unmet. The bolt was committed
in that state (`e33fdd2`).

Caught on review of the plan against the commit. Fixed in a follow-up: `LocationRow` now lists
each category pointing at the stop as _"Everything in X"_ above the items, with a **Move all**
action that opens that category's picker in the section below — so the affordance leads somewhere
rather than pointing at a section the user then has to find. Two tests added.

Recording it because the failure mode is the one this whole intent exists to correct: a report
that lists only the criteria that passed reads exactly like a report where everything passed.

### Not Covered

- Mobile scroll performance with 39 items at one stop — the NFR bar is recorded; no automated
  proxy
- The shopping list re-sorting after a category move — bolt 058
- A registry orphan in the all-groceries list — no orphan exists in this household; asserting one
  would require the kind of manufactured state this bolt exists to stop trusting
