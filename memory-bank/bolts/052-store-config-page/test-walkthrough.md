---
stage: test
bolt: 052-store-config-page
created: '2026-09-04T22:35:00Z'
---

## Test Report: 002-store-config-page (bolt 052)

### Summary

- **Tests**: 253/253 passing (30 files) — **40 new** in this bolt
- **Before this bolt**: 213 across 27 files
- **Coverage**: no formal percentage target (`coding-standards.md`: "focus tests on logic that's
  genuinely risky to get wrong"). Here that is the similarity engine and the two-path removal.

| Gate              | Result           |
| ----------------- | ---------------- |
| `npx vitest run`  | 253/253 passed   |
| `npx tsc -b`      | Clean            |
| `npx eslint src/` | Clean            |
| `npx vite build`  | ✓ built in 3.96s |

### Test Files

- [x] `src/features/store-config/similarity.test.ts` - 22 tests: normalization, dedup-key edge cases, dismissals, self-exclusion, cutoff behaviour, rare-token weighting, and the eight false-friend family pairs.
- [x] `src/features/store-config/location-name.test.ts` - 6 tests: aisle inference, the section default, and an agreement property between the two exported helpers.
- [x] `src/features/store-config/components/StoreConfigPage.test.tsx` - 12 tests: list rendering, previews, arrow enablement and reorder, add, rename, and both removal paths.

### Acceptance Criteria Validation

**Story 001 — similarity algorithm**

- ✅ Normalization lowercases, strips punctuation, singularizes, and removes stopwords from one
  exported constant
- ✅ Dismissed pairings excluded — asserted by running the same query with and without a
  dismissal
- ✅ Up to `maxCandidates` returned; empty list below the cutoff
- ✅ An item is excluded from its own candidate list
- ✅ Rarer shared tokens outweigh common ones
- ✅ A shared category refines a match but cannot create one — asserted behaviourally _and_ as
  an invariant on the constants (`categoryBonus < scoreCutoff`)
- ✅ **All 8 false-friend pairs** return no confident match: green/black beans, heavy/sour cream,
  ice cream/cream of tartar, whole/coconut milk, oat/evaporated milk, olive/sesame oil, soy/hot
  sauce, tortilla/chocolate chips
- ⚠️ _"Only items with an explicit placement are candidates"_ is a **caller** contract, not
  something this pure function can enforce — it scores whatever candidate list it is given. Bolt
  053 builds that list and owns the assertion.

**Story 002 — walking-path list**

- ✅ One ordered list; the two-panel layout is gone (asserted by absence: no "Category
  assignments" text, no `combobox`)
- ✅ Collapsed rows show a one-line item preview; an empty stop reads "Nothing here yet"
- ✅ An unassigned item never appears against a stop
- ✅ Arrows disabled at the ends, enabled elsewhere, aria-labelled with stop and direction
- ✅ Reorder calls the RPC with the **neighbour's** position and announces politely
- ✅ Add appends at the end (`position = stops.length + 1`)
- ✅ Rename is in place and re-derives `type` from the new name
- ✅ Removing an empty stop shows no confirmation
- ➖ Expand/collapse, the 4-row cap, and the "+N more" link are implemented but not asserted —
  see "Notes".

**Story 006 — delete confirm**

- ✅ A stop with placements shows the count and the full consequence copy
- ✅ Exactly two actions; "Keep it" dismisses and changes nothing
- ✅ Confirming calls `deleteLocation` for the right stop
- ✅ A stop holding **only** a category default still warns — asserted against a stop whose
  visible item list is empty, proving the count comes from the database rather than from the
  rendered rows

### Issues Found

**Three real bugs in `singularize`, found by the tests, fixed in the module:**

| Input      | Was       | Now        |
| ---------- | --------- | ---------- |
| `tomatoes` | `tomatoe` | `tomato`   |
| `molasses` | `molass`  | `molasses` |
| `couscous` | `couscou` | `couscous` |

The `-oes` case was simply missing. The other two are the hazard the module's own comment warned
about — a mass noun ending in `-s` being mangled into a collision — and the generic rules cannot
tell `molasses` from `glasses`, so a small food-specific `INVARIANT_TOKENS` set now lists the
exceptions rather than guessing. `glasses → glass` still works via a new `-sses` rule.

**Two defects in my own first draft of the tests:**

- The rare-vs-common weighting test compared _cutoff-filtered_ results, so both sides were empty
  and the assertion was vacuous. The ordering was in fact correct (0.45 vs 0.34) — both simply
  sat below the 0.5 cutoff. Rewritten as a controlled comparison: two single-token candidates,
  symmetric except in token rarity, where only the rare one clears.
- Two removal assertions failed because Vitest is **not** configured with `clearMocks`, so
  `deleteLocation`'s call count leaked from the preceding test. Added `vi.clearAllMocks()` to
  `beforeEach` — worth knowing for any future test file here that asserts a mutation was _not_
  called.

### Notes

- **`similarity.ts` still has no caller.** Its 22 tests are the only thing exercising it, which
  is the intended state at this bolt's end — bolt 053 wires it into the assign flow.
- **Expand/collapse is untested.** It is local, non-persisted UI state with no data
  consequence; story 007 (bolt 053) owns the consolidated page test pass and is the right place
  for it if it is worth covering at all.
- **The cutoff is the tuning knob.** `SIMILARITY_TUNING.scoreCutoff` at 0.5 currently rejects
  every false-friend pair while still matching a true restatement ("Organic Black Beans" →
  "black beans"). If bolt 053 shows suggestions are too rare in practice, lower it and re-run
  this file — the false-friend cases are the regression net.
- **The shopping list is untouched** and its 6 tests still pass against the relocated legacy
  module.
