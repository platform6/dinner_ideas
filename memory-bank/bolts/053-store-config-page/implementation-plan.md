---
stage: plan
bolt: 053-store-config-page
created: '2026-09-04T22:45:00Z'
---

## Implementation Plan: 002-store-config-page (bolt 053)

### Objective

Finish the page. Bolt 052 built the path; this bolt makes **placing an ingredient** a complete
flow — with or without a suggestion — adds the calm home for everything not yet placed, and
makes the page read correctly with nothing configured and at desktop width. Then the
consolidated test pass for the whole unit.

This is the bolt that finally gives `similarity.ts` a caller.

---

### Deliverables

**Assign flow (story 003)**

- `components/AssignSheet.tsx` — bottom sheet: eyebrow, item name, one-line resolution in plain
  words, the suggestions block when any candidate clears the cutoff, the full-path picker, and
  "Take it off the path" for an explicitly placed item.

**Unassigned section (story 004)**

- `components/UnassignedSection.tsx` — collapsed "Not on the path yet" with a count chip and a
  consequence subtitle; expanded, a search field over the full catalog and item cards with a
  "Place" action.

**First run + desktop (story 005)**

- `components/FirstRunPanel.tsx` — the no-stops-configured panel.
- `StoreConfigPage.tsx` — desktop measure, the inline preview at width, and the read-only store
  chip beside the title.

**Data layer**

- `api.ts` / `hooks.ts` — `placeItem`, `unplaceItem`, `dismissSuggestion`, `fetchDismissals`,
  `fetchInRecipeNameKeys`.

**Tests (story 007)**

- `AssignSheet.test.tsx`, `UnassignedSection.test.tsx` (new), plus first-run and desktop cases
  added to `StoreConfigPage.test.tsx`.

---

### Dependencies

- **Bolt 052** — the path list, `similarity.ts`, `location-name.ts`, the data layer.
- **Bolt 050/051** — `item_placements`, `suggestion_dismissals`, the resolution view.
- **Chakra UI v2 `Drawer`** — already a dependency. Used for the sheet because it provides the
  focus trap, `Escape` close, and focus return that story 003 requires, correctly, rather than
  hand-rolling them.
- **`matchMedia` polyfill** from intent 005's desktop-layout test infrastructure, for the
  desktop cases.
- **No new npm package. No new theme token or variant.**

---

### Technical Approach

**The sheet is a Chakra `Drawer` with `placement="bottom"`.** Focus trap, `Escape`, and
focus-return-to-trigger are the three a11y criteria in story 003, and Chakra's `Drawer` already
implements all three to spec. Hand-rolling them would be strictly worse and is the kind of thing
that silently regresses.

**One resolution line, three shapes.** Driven off the `ResolvedItem.state` the page already has:

| State        | Line                                                 |
| ------------ | ---------------------------------------------------- |
| `unassigned` | `{category} · not placed`                            |
| `placed`     | `{category} · placed in {location}`                  |
| `inherited`  | `{category} · following {viaCategory} to {location}` |

Plain words naming the mechanism, per the spec — not a badge.

**Suggestions are computed, not fetched.** `findSimilarPlacedItems` runs client-side over data
already loaded: candidates are the resolution rows with `state === 'placed'`, which is exactly
story 001's "only explicit placements are evidence" — the caller contract bolt 052's tests
explicitly could not assert. This bolt is where that gets asserted.

When nothing clears the cutoff the block is simply absent and the picker heading changes from
"Or pick a spot" to "Pick a spot". No empty state, no "no suggestions found".

**"Same spot" and picking from the picker are the same write** — an `item_placements` upsert on
`(item_id, store_id)`. The only difference is which `location_id` it carries.

**Default scope vs. search.** The section lists **unassigned** items; the default list is
narrowed to those used in at least one _active_ recipe, and the search widens to every
unassigned item including those used in none.

> **Interpretation to confirm**: the spec says the search field "reaches past the default scope
> into the full catalog", and the story's edge case is an item _used in 0 recipes_ still being
> found. Both are about recipe-usage scope, not placement state — so search widens the
> recipe-usage filter but stays within unassigned items. Showing already-placed items under a
> heading that says "Not on the path yet" would contradict the section's own title.

`fetchInRecipeNameKeys` embeds `dinners!inner(is_active)` on `dinner_ingredients` and normalizes
names to `name_key`s client-side, matching the registry's own dedup rule. Household-scale (~284
rows).

**Desktop** is a `maxW` on the page container (720px) plus moving the preview onto the name's
line at `md`. No second panel at any width — the walking path is a sequence read top to bottom,
and that is true at every width.

---

### Acceptance Criteria

**Story 003 — assign flow**

- [ ] Opens from a placement pill or a "Place" action, naming the item and one line of current
      resolution in plain words
- [ ] Suggestions block appears above the picker only when a candidate clears the cutoff; each
      shows matched item + location, a "Same spot" accept, and a × that records a dismissal
- [ ] Nothing pre-selected or auto-applied; multiple candidates render with equal weight and no
      ranking language
- [ ] No candidates → block absent entirely, picker heading becomes "Pick a spot"
- [ ] Picker lists the full path in order with the same type chip; the current explicit
      location is marked
- [ ] "Take it off the path" appears **only** for an explicit placement and deletes the row
- [ ] Focus trap, `Escape` closes, focus returns to the opener

**Story 004 — unassigned section**

- [ ] Collapsed "Not on the path yet" below the path, with a count chip and a consequence
      subtitle ("N groceries sort to the end")
- [ ] Default scope = items used in ≥1 active recipe
- [ ] Search reaches the full catalog, placeholder "Search all groceries"
- [ ] Each result shows name, category, and a "Place" action opening the sheet
- [ ] Two neutral empty states: "Everything has a spot on the path." and the search term quoted
      back

**Story 005 — first run + desktop**

- [ ] No stops → one panel: heading, body copy, "Add the first stop", and the closing line about
      alphabetical order. No warning styling.
- [ ] Desktop stays a single column at a 600–720px measure; preview moves onto the name's line
- [ ] The active store shows as a read-only chip beside the title

**Story 007 — consolidated tests**

- [ ] `AssignSheet.test.tsx`: all three resolution lines, accept writes the placement, dismiss
      writes the dismissal and suppresses that pairing on reopen, "Take it off the path"
      removes, focus trap + Escape + focus return
- [ ] `UnassignedSection.test.tsx`: default scope vs. search, both empty states, "Place" opens
      the flow
- [ ] `StoreConfigPage.test.tsx`: first-run and desktop states added
- [ ] Similarity is **not mocked** when testing the assign flow — exercised for real with small
      fixtures, per the story's technical note
- [ ] Full suite green; `tsc -b`, `eslint`, `vite build` clean

---

### Risks

1 - **The suggestion block only appears when real data clears a precision-tuned cutoff.** Its
tests must use fixtures that genuinely score above 0.5 rather than asserting on a mocked
engine — which is what the story asks for, and also the only way the caller contract
("explicit placements only") gets verified.

2 - **`item_placements` upsert goes through PostgREST.** ADR-6 records a production failure
where `.upsert()` hit `42501` on a table with column-level grants. `item_placements` has no
column-level carve-out, so this should be fine — but ADR-6's lesson was that the path had never
been exercised against real grants. Worth a manual check against the local database before
calling the bolt done.

3 - **Desktop assertions depend on `matchMedia`**, which jsdom does not implement. Reusing
intent 005's polyfill rather than inventing a second approach.
