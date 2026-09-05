---
stage: plan
bolt: 052-store-config-page
created: '2026-09-04T22:16:02Z'
---

## Implementation Plan: 002-store-config-page (bolt 052)

### Objective

Replace the two-panel "Rows + Category Assignments" page with the **walking path**: one ordered
list of stops, sections and aisles as visual peers, with add / rename / reorder / remove and the
page's single destructive confirm. Ship the similarity engine alongside it as a standalone,
unit-tested pure module — it has no UI in this bolt; bolt 053 consumes it.

This is the bolt that moves the frontend off the old model. After it, nothing in
`src/features/store-config/` reads `grocery_store_rows` or `category_row_assignments`.

---

### Deliverables

**Similarity engine (story 001)**

- `src/features/store-config/similarity.ts` — pure functions, no network, no SQL:
  normalization (lowercase, strip punctuation, crude singularization, stopword removal),
  rarer-token-weighted overlap scoring, category bonus, dismissal exclusion, cutoff + top-3.
- The stopword list and the tuning constants (cutoff, category bonus, max candidates) live in
  **one exported constant block** at the top of the file, per the story's "kept in one editable
  constant".

**Data layer (story 002)**

- `types.ts` — replace `GroceryStoreRow` / `CategoryRowAssignment` with `Location`, `Item`,
  `ItemPlacement`, `CategoryPlacement`, `SuggestionDismissal`, and `ResolvedItem` (the
  `item_location_resolution` view row).
- `api.ts` — replace all six old functions: fetch the active store, fetch locations ordered by
  position, fetch the resolution rows, add / rename / delete a location, `reorder_location`
  RPC, and the placement counts for the delete confirm.
- `hooks.ts` — TanStack Query wrappers mirroring the existing shape (one query key per
  resource, `invalidateQueries` on mutate).

**Walking-path UI (stories 002, 006)**

- `components/StoreConfigPage.tsx` — reworked to the single ordered list.
- `components/LocationRow.tsx` — the collapsed/expanded row: type chip, name, item preview,
  count, arrows, chevron, and inline rename.
- `components/AddStopRow.tsx` — the inline dashed append affordance.
- `components/DeleteLocationConfirm.tsx` — the count-stated destructive panel.

---

### Dependencies

- **Bolt 051 (complete)** — `locations`, `item_placements`, `category_placements`,
  `suggestion_dismissals`, the `item_location_resolution` view, and `reorder_location`. All
  applied locally and typed in `database.types.ts`.
- **Chakra UI v2 + the existing theme** — every token the spec names (`paper.base`,
  `paper.subtle`, `paper.sunken`, `line.subtle`, `line.DEFAULT`, `line.brand`, `brand.100/500`,
  `ink.400/500`, `heart.50/200/500/700`, `radii.card`, `radii.control`, `meta`) is already
  defined in `src/shared/theme/index.ts`. **Verified — no new tokens, no new variant.**
- **No new npm package.**

---

### Technical Approach

**Similarity scoring.** Rarer-token weighting is an inverse-document-frequency over the
candidate set: a token's weight is derived from how many placed items contain it, so a shared
"tahini" outweighs a shared "beans". Score is the summed weight of shared tokens, normalized by
the query item's own token weight, plus a small flat category bonus that cannot on its own
clear the cutoff. Tuned for **precision** — returning zero candidates is an acceptable outcome;
a confident wrong one is not.

**Reading the path.** One query per resource rather than a join: `locations` ordered by
`position`, and the resolution view filtered to the active store. The row's preview and count
come from grouping the resolution rows by `location_id` client-side — household-scale data
(dozens of rows), and it keeps the view's shape as the single source of placement truth.

**Type chip.** The aisle number is parsed from `name` at render time and never stored or edited
separately — `type` drives display only. A name with no parseable number renders as a section
chip, which is also the fallback when `type = 'aisle'` but the name lost its number.

**Reorder.** Arrow press → `reorder_location(location_id, position ± 1)` → invalidate. Arrows
`stopPropagation` so they don't also toggle the row, render _disabled_ (not hidden) at the ends
so row geometry stays stable, and carry aria-labels naming the stop and direction. The result is
announced politely via an `aria-live="polite"` region.

**Delete.** Two paths from one control. `Remove` reads the placement count for that
`location_id` first: zero → delete immediately, no dialog; non-zero → the `heart.*` confirm
panel stating the count and the consequence. The filled `heart.500` button is styled **at the
call site**; no `danger` variant is added to the theme.

**Expanded state** is `useState` in the row, not persisted, not lifted.

---

### Acceptance Criteria

**Story 001 — similarity algorithm**

- [ ] Normalization lowercases, strips punctuation, crudely singularizes, and removes stopwords
      from one editable constant
- [ ] Only Items with an **explicit** `item_placements` row in the active store are candidates —
      inherited placements are never evidence
- [ ] Rarer shared tokens outweigh common ones; a shared category adds a bonus that cannot
      carry a match alone
- [ ] Dismissed `(item_id, suggested_item_id)` pairings are excluded
- [ ] Returns up to 3 above the cutoff, unranked to the caller; empty list below cutoff
- [ ] The false-friend families (_beans_, _cream_, _milk_, _oil_, _sauce_, _chips_) do not
      produce confident wrong matches
- [ ] An item is excluded from its own candidate list

**Story 002 — walking-path list**

- [ ] One list; sections and aisles share chip size/position/weight, row height, and indentation
- [ ] Collapsed row shows chip, name, count, arrows, chevron, and a one-line preview of the
      first few item names with "+N more"; an empty stop reads "Nothing here yet"
- [ ] Expanded shows item rows on `paper.subtle`, inset past the chip, capped at 4 + "+N more";
      state is local and does not persist
- [ ] An inline dashed "Add an aisle or section" row appends at the end
- [ ] Rename is in place with Save/Cancel and a quiet "Remove"; the type chip stays visible
- [ ] Arrows call `reorder_location`, stop propagation, disable at the ends, are aria-labeled,
      and announce politely
- [ ] Removing an **empty** stop shows no confirmation
- [ ] The two-panel layout is gone; no `Select`-per-category assignment control remains

**Story 006 — delete confirm**

- [ ] A stop with placements shows the count-stated panel with the exact consequence copy
- [ ] Exactly two actions: "Keep it" (outlined) and "Remove" (filled `heart.500`, call-site
      styled)
- [ ] Confirming deletes the Location; the list re-renders without it; placements cascade and
      **no Item is deleted**
- [ ] A `category_placements`-only stop still counts and warns
- [ ] Escape / "Keep it" changes nothing

**Quality**

- [ ] `npx tsc -b`, `npx eslint src/`, and `npx vite build` all clean
- [ ] Copy uses the page's vocabulary — "Walking path", "stop", "Not on the path yet" — and
      never "placement", "assignment", "inherited", or "unassigned"
- [ ] No motion; no new theme token or variant

---

### Out of Scope (bolt 053)

The assign bottom sheet and the similarity **UI** (story 003), the "Not on the path yet"
section (004), first-run and desktop treatments (005), and the consolidated test pass (007).

`similarity.ts` ships here with its own unit tests but **no caller** — deliberate, per the
bolt's own note: land and test the pure function in isolation before wiring it into a flow.

---

### Risks

1 - **The page has no way to place an item until bolt 053.** Between these two bolts the path
is configurable but item-level placement is not reachable in the UI. Acceptable — the two bolts
ship together as unit 002 — but the page is genuinely incomplete at this bolt's checkpoint, and
should not be judged as a finished feature.

2 - **The existing page tests will be rewritten, not merely updated.**
`StoreConfigPage.test.tsx` and `api.test.ts` cover the old model's two-panel behaviour, which
ceases to exist. Story 007 (bolt 053) owns the consolidated test pass; this bolt keeps the suite
green rather than comprehensive.

3 - **Similarity tuning is judgment, not arithmetic.** The cutoff and category bonus will be set
against the false-friend families in the tests and may need adjusting once bolt 053 shows real
suggestions in context.
