---
stage: plan
bolt: 012-weekly-dinner-planner-ui
created: 2026-08-27T03:35:00Z
---

## Implementation Plan: weekly-dinner-planner-ui (follow-up: card details + tags)

### Objective

Add an expandable "Details" section to each catalog card (ordered cooking steps + full ingredient list), and replace the old Rosie-approved badge/filter with real tag display, add ("+"), remove, and filter-by-tag — using the `tags`/`dinner_tags` schema from bolt `009-dinner-catalog`. This also fixes the build break flagged in `009`'s test report (8 files still reference the now-dropped `rosie_approved`).

### Deliverables

- `src/features/dinners/types.ts`: add `Tag` row type and a `DinnerFullDetails` type (ingredients + steps + tag names) for the lazy-loaded expanded section.
- `src/features/dinners/tags.ts` (new): `normalizeTagName(name)` — trim + lowercase, pure function, unit-tested.
- `src/features/dinners/api.ts`:
  - `fetchDinnerFullDetails(dinnerId)` — one query embedding `dinner_ingredients`, `dinner_steps` (ordered), `dinner_tags(tags(name))`; fetched only when a card is first expanded (not up front for all cards).
  - `fetchAllTags()` — full tag vocabulary, for the filter control.
  - `addTagToDinner(dinnerId, tagName)` — normalize, upsert `tags` by name (`onConflict: 'name'`), then insert `dinner_tags` (`onConflict: 'dinner_id,tag_id' ignoreDuplicates`).
  - `removeTagFromDinner(dinnerId, tagId)` — delete the `dinner_tags` row only.
  - `fetchActiveDinners`/`fetchSuppressedDinners`: embed `dinner_tags(tags(name))` so the catalog list/filter has each dinner's tags without a second round trip.
- `src/features/dinners/hooks.ts`: `useDinnerFullDetails(dinnerId, enabled)`, `useAllTags()`, `useAddTag()`, `useRemoveTag()` (invalidate active/suppressed dinners + the expanded-details query + the all-tags query on success).
- `src/features/dinners/filters.ts`: replace `rosieApprovedOnly` with `tags: string[]` — a dinner matches if it has **any** of the selected tags (OR semantics; documented explicitly since AND was the other reasonable option).
- `src/features/dinners/components/CatalogFilters.tsx`: replace the Rosie-approved checkbox with a `CheckboxGroup` of available tags (simple, accessible, matches the existing checkbox-based interaction style — no new component library needed).
- `src/features/dinners/components/CatalogPage.tsx`: wire `useAllTags()` into `CatalogFilters`; `defaultFilters.tags = []`.
- `src/features/dinners/components/DinnerCard.tsx`:
  - Remove the Rosie-approved `Badge`.
  - Add a "Details ▾/▴" toggle (local `useState`, independent per card).
  - When expanded: lazy-fetch via `useDinnerFullDetails`; render ordered steps, ingredient list, tag `Badge`s (each with a small remove control), and a "+" control (small text input + confirm) to add a new tag.
- Test fixture cleanup: remove `rosie_approved` from dinner fixtures in `filters.test.ts`, `CatalogPage.test.tsx`, `CookingViewPage.test.tsx`, `ShoppingListPage.test.tsx`, `PlanPage.test.tsx`, `toggle-selection.test.ts`, `aggregate.test.ts` (the field no longer exists on the type — these are currently the 15 compile errors from bolt `009`'s test report).
- New tests: `tags.test.ts` (normalization), `filters.test.ts` additions (tag filtering, OR semantics), `DinnerCard.test.tsx` (new — expand/collapse, add/remove tag flow, mocking Supabase at the boundary per `coding-standards.md`).

### Dependencies

- `009-dinner-catalog` (complete): `tags`/`dinner_tags` schema live on the real project.
- Existing `dinner_steps`/`dinner_ingredients` data (from `001`/`007-dinner-catalog`).

### Technical Approach

- **Lazy fetch, not eager**: expanded-card data (steps/ingredients/tags) is fetched per-dinner only on first expand (`enabled: isExpanded` on the query), not preloaded for the whole catalog — avoids a heavy up-front query across ~50 dinners for detail most won't open.
- **Tag filter semantics — OR, not AND**: selecting "kid-friendly" + "spicy" shows dinners with _either_ tag, not only ones with both. Chosen because AND semantics on a small, freeform vocabulary tends to produce empty results fast and surprises users; flagging this as a judgment call in case the wife's mental model differs once she's using it.
- **Add-tag UX**: a small inline text input + "Add" button/icon inside the expanded section (not a modal) — consistent with the app's low-fuss interaction style elsewhere (checkboxes, inline buttons, no dialogs yet).
- **Client-side lowercase too**: `normalizeTagName` runs before the API call, purely so the UI reflects the final lowercase value immediately rather than surprising the user with a re-cased tag after refetch — the DB `CHECK` constraint remains the actual enforcement (per `ADR-1`, per bolt `009`'s design).

### Acceptance Criteria

Directly from stories `011-catalog-card-expandable-details` and `012-tag-management-ui`:

- [ ] Each card has a working Details expand/collapse toggle, independent per card
- [ ] Expanded state shows ordered steps, full ingredient list, tags, and the "+" control
- [ ] Adding a tag saves immediately and appears without a page reload
- [ ] Removing a tag from a dinner updates immediately and doesn't delete the tag from other dinners
- [ ] The old Rosie-approved badge/filter checkbox are gone
- [ ] Catalog Filters offers a tag filter that narrows results
- [ ] `npx tsc -b` passes clean (fixes the 8-file break from bolt `009`)
- [ ] `pnpm test` passes

---

### Checkpoint

Ready to proceed to Stage 2 (Implement)?
