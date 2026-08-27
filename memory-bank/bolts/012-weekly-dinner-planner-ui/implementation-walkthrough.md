---
stage: implement
bolt: 012-weekly-dinner-planner-ui
created: 2026-08-27T04:00:00Z
---

## Implementation Walkthrough: weekly-dinner-planner-ui (follow-up: card details + tags)

### Summary

Added an expandable "Details" section to each catalog card (ordered cooking steps, ingredients, and tags) and a full tag management UI (add/remove/filter), replacing every reference to the now-dropped `rosie_approved` column. Also fixes the build break flagged in bolt `009-dinner-catalog`'s test report.

### Structure Overview

Tag/details logic lives alongside the existing dinner-catalog feature module (`src/features/dinners/`), following the same layering already established there: types → api (Supabase calls) → hooks (`@tanstack/react-query`) → components. No new feature folder was needed. A new small pure-logic file (`tags.ts`) holds the one normalization rule worth testing in isolation.

### Completed Work

- [x] `src/features/dinners/types.ts` — added `Tag`, `CatalogDinner` (catalog list dinner + tags), and `DinnerFullDetails` (expanded-section data: steps + ingredients + tags-with-ids)
- [x] `src/features/dinners/tags.ts` — `normalizeTagName`, the client-side trim+lowercase helper
- [x] `src/features/dinners/api.ts` — `fetchActiveDinners`/`fetchSuppressedDinners` now embed and flatten tags; added `fetchDinnerFullDetails`, `fetchAllTags`, `addTagToDinner`, `removeTagFromDinner`
- [x] `src/features/dinners/hooks.ts` — added `useDinnerFullDetails` (lazy, enabled only when expanded), `useAllTags`, `useAddTag`, `useRemoveTag`
- [x] `src/features/dinners/filters.ts` — replaced the Rosie-approved filter with OR-semantics tag filtering
- [x] `src/features/dinners/components/CatalogFilters.tsx` — replaced the Rosie-approved checkbox with a `CheckboxGroup` tag filter
- [x] `src/features/dinners/components/CatalogPage.tsx` — wires `useAllTags()` into the filter bar; default filter state updated
- [x] `src/features/dinners/components/DinnerCard.tsx` — removed the Rosie-approved badge; added the Details expand/collapse toggle, a `DinnerCardDetails` subcomponent (lazy-fetched steps/ingredients/tag management), and a tag badge row on the collapsed card
- [x] Test fixture cleanup (removed `rosie_approved` from fixtures — the field no longer exists): `CookingViewPage.test.tsx`, `ShoppingListPage.test.tsx`, `PlanPage.test.tsx`, `toggle-selection.test.ts`, `aggregate.test.ts`, `CatalogPage.test.tsx`
- [x] `src/features/dinners/filters.test.ts` — rewritten for tag filtering (including an explicit OR-not-AND test)
- [x] `src/features/dinners/tags.test.ts` (new) — `normalizeTagName` unit tests
- [x] `src/features/dinners/components/DinnerCard.test.tsx` (new) — expand/collapse, add-tag, remove-tag component tests

### Key Decisions

- **Lazy per-card fetch**: `useDinnerFullDetails` only runs once a card is expanded (`enabled` flag), not preloaded for the whole catalog — matches the plan's stated reasoning (avoids a heavy query across ~50 dinners for detail most won't open).
- **Separate `CatalogDinner` type, not widening `DinnerWithIngredients`**: tags are only relevant to catalog browsing/filtering, not the shopping list or weekly-plan flows, which also use `DinnerWithIngredients`/`Dinner`. Keeping tags on a new additive type avoids touching those other call sites.
- **One combined query for expanded details**: steps, ingredients, and tags are fetched in a single Supabase call (`select=dinner_steps(*),dinner_ingredients(*),dinner_tags(tags(id,name))`) rather than three separate round trips.
- **Inline add-tag control, no modal**: a small input + button inside the expanded section, consistent with the app's existing low-fuss interaction style (per `ux-guide.md`).

### Deviations from Plan

None — implementation matches `implementation-plan.md` as approved.

### Dependencies Added

None — built entirely on existing dependencies (`@tanstack/react-query`, Chakra UI components already in use elsewhere: `CheckboxGroup`, `Wrap`, `CloseButton`, `OrderedList`/`UnorderedList`).

### Developer Notes

- Tag filter is OR (any selected tag matches), not AND — see `filters.ts`'s doc comment and the explicit test in `filters.test.ts` if this ever needs revisiting.
- `removeTagFromDinner` only deletes the `dinner_tags` association row — the shared `tags` row is never deleted, so removing a tag from one dinner never affects others still using it.
- Ran `npx tsc -b`, `npx eslint .`, `npx vitest run` (77/77 passing), and `npx vite build` — all clean.
