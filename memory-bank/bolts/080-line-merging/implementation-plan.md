---
stage: plan
bolt: 080-line-merging
created: '2026-09-24T15:00:52Z'
---

## Implementation Plan: line-merging

### Objective

One line per grocery on the shopping list: prep notes stop splitting a line, and each unit's total
sits side by side on it.

### What the code shows

**`aggregate.ts:19`**: the merge key is `normalize(name)|normalize(unit)`, so both the name and the
unit split a line. The first appearance's raw `name` and `unit` are shown.

**`ShoppingListItem`** (`types.ts`) is `{ name, unit, quantity, category }`. Three consumers read
`quantity`/`unit`:

1. `format.ts:7`: the clipboard line `- {quantity} {unit} {name}`
2. `ShoppingListPage.tsx:370`: the row's amount, `{quantity} {unit}`
3. `ShoppingListPage.tsx:43/328`: the check-state key `itemKey(category, name, unit)`

**Load order**: `useShoppingListDinners` sorts the dinner ids for the query key, but
`fetchDinnersByIds` returns rows in whatever order Postgres chooses, and each dinner's
`dinner_ingredients` has no `order by`. So today, "first appearance" (whose capitalization is shown)
already depends on load order. NFR-3 fixes that.

### Deliverables

1. **`shopping-list/merge-key.ts`** (new): the merge key, kept separate from `aggregate.ts` so unit
   002 and the tests can use it directly.
   - `PREP_WORDS`: one exported constant, the prep-word list. The initial list: diced, cubed, minced,
     chopped, sliced, grated, shredded, crushed, peeled, finely, roughly, thinly, halved, quartered.
   - `mergeKey(name)`: lowercase and trim, cut at the first comma, drop whole-word prep words,
     collapse spaces. If that leaves nothing, fall back to `lower(trim(name))` (story 001: never an
     empty key).
   - `plainLabel(name)`: the same cuts applied to the raw name, **keeping its capitalization**, with
     the same fallback (story 003).
2. **`ShoppingListItem`** becomes `{ name, amounts: { unit, quantity }[], category, sourceNames }`
   - `name` is the plain label from the first appearance
   - `amounts`: one entry per distinct normalized unit, in first-appearance order. The shown unit is
     that unit's first raw spelling, as today
   - `sourceNames`: the distinct raw names that went into the line, in first-appearance order. They
     aren't displayed; unit 002 uses them to choose the line's aisle
3. **`aggregate.ts`**: sorts dinners by `id`, and each dinner's ingredients by `id`, before merging
   (NFR-3), then merges on `mergeKey(name)` alone. The category is the first appearance's, as today.
4. **`format.ts`**: a shared `formatAmounts(amounts)` → `"2 lb + 4"`, used by the clipboard line and
   the row, so the two can't drift (story 002). A unitless amount prints without a trailing space.
5. **`ShoppingListPage.tsx`**: the row shows `formatAmounts(item.amounts)`, and the check-state key
   becomes `itemKey(category, name)`. The unit is gone from the key because a line now holds
   several.

### Dependencies

- None. No new package, no schema change (NFR-1).
- **Unit 002 / bolt 081**: after this bolt, `reorder.ts` and the page still look a line up by
  `nameKey(line.name)`. For a merged line that's the plain label, so a placement made only on
  "chicken thighs, cubed" won't be found. **That's the gap 081 closes, and why 080 isn't released on
  its own.**

### Technical Approach

- **Whole-word removal** uses a word-boundary pattern built from `PREP_WORDS`, so "sliced" goes and
  "slice of bread" stays. Hyphenated compounds like "pre-sliced" aren't handled on purpose
  (precision, NFR-2).
- **Cut at the first comma** before removing words, so "onion, finely chopped" → "onion".
- **Why the key isn't `nameKey`**: `nameKey` must stay identical to `items.name_key` in the database
  (`reorder.ts` explains why). The merge key is a new, looser grouping for display only. Keeping them
  as separate functions keeps that line clear.
- **Check-state key**: category + plain label is unique per line, because the label comes from the
  merge key. Story 002 of unit 002 re-checks this against moves; the existing test
  `preserves check state across a move` must still pass here.

### Acceptance Criteria

- [ ] "chicken thighs" + "chicken thighs, cubed" → one line (story 001)
- [ ] "onion" + "diced onion" + "onion, finely chopped" → one line (story 001)
- [ ] Case and whitespace don't split a line (story 001, existing test)
- [ ] "onion" / "onions" stay two lines (story 001)
- [ ] "chopped" alone keeps a non-empty key and its raw name (story 001)
- [ ] Look-alike pairs stay apart: tomato sauce / tomato paste, chicken broth / chicken thighs, green
      onion / onion (NFR-2)
- [ ] `PREP_WORDS` is one exported constant (story 001)
- [ ] 1 lb + 1 lb → `2 lb`; 2 lb + 4 unitless → `2 lb + 4`; 1 tbsp + 2 tsp stays unconverted (story 002)
- [ ] Amounts are in first-appearance order (story 002)
- [ ] Shuffled dinners and shuffled ingredients give an identical list (NFR-3)
- [ ] The clipboard and the row show the same amounts text (story 002)
- [ ] The label has no prep notes and keeps the first appearance's capitalization (story 003)
- [ ] The cooking view is untouched: no file outside `shopping-list/` changes (story 003)
- [ ] Every new test is shown failing against the old `aggregate.ts` before it's accepted
- [ ] Browser: the household's week gives a shorter list with nothing missing
