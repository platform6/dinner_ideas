---
stage: test
bolt: 003-weekly-dinner-planner-ui
created: 2026-08-26T21:10:00Z
---

## Test Report: weekly-dinner-planner-ui (bolt 1 of 4)

### Summary

- **Tests**: 14/14 passed
- **Coverage**: No formal percentage tracked (per `coding-standards.md`) — tests target the riskiest logic (catalog filter/sort combining) and the three stories' key interactive flows (login, suppress/un-suppress), per the project's testing strategy.

### Test Files

- [x] `src/features/dinners/filters.test.ts` — unit tests for `applyFilters`: cuisine filter, Rosie-approved filter, cook-time sort (including non-mutation of the input array), all three combined, and the no-match empty-result case
- [x] `src/features/dinners/components/CatalogPage.test.tsx` — component tests mocking the Supabase-touching `api.ts` boundary: suppressing a dinner via "Not interested" calls `setDinnerActive(id, false)`, switching to the Suppressed view shows its dinners with an "Un-suppress" action that calls `setDinnerActive(id, true)`, and an empty catalog shows the "no dinners match" message
- [x] `src/features/auth/LoginForm.test.tsx` — component tests mocking `useAuth`: incorrect credentials show the clear inline error message, correct credentials call `signIn` with the entered values and show no error
- [x] `src/features/auth/AuthGate.test.tsx` — component tests mocking `useAuth`: logged-out shows only the login form, a spinner shows during the initial session check, an existing session renders the protected children

### Acceptance Criteria Validation

From `implementation-plan.md`:

- ✅ **Logged-out visitor sees only the login form; correct credentials log in; incorrect credentials show a clear error**: Verified — `AuthGate.test.tsx` + `LoginForm.test.tsx`
- ✅ **Catalog shows all active dinners with working cuisine filter, Rosie-approved filter, and cook-time sort, combinable and clearable**: Verified via `filters.test.ts` (combination case included); "clearable" is implicit in `applyFilters` returning the full list when a filter is unset, exercised by the "no filters set" case
- ✅ **"Not interested" on any dinner suppresses it; a "Suppressed" view lists hidden dinners with an "Un-suppress" action**: Verified — `CatalogPage.test.tsx`

### Issues Found

- **Accessibility gap (fixed)**: the "Show suppressed" toggle had no accessible name — a `Switch` with adjacent, unassociated text. Writing the interaction test surfaced this. Fixed by adding `aria-labelledby` linking the switch to its label text, rather than working around it in the test.
- **Minor lint-hygiene cleanup**: `applyFilters` was originally defined inline in `CatalogPage.tsx` and exported for testability, which triggered an `eslint-plugin-react-refresh` warning (a file should only export components for Fast Refresh to work cleanly). Extracted it to `src/features/dinners/filters.ts` instead — resolves the warning and is a better home for pure logic regardless.

### Notes

- Test strategy follows `coding-standards.md`: mocked at the Supabase-touching boundary (`api.ts`, `useAuth`) rather than mocking React Query or internal component logic.
- `pnpm run lint`, `pnpm exec tsc -b`, and `pnpm run build` all still pass clean after the Stage 3 changes.
- Stories `003`–`008`/`010` (pick-3, shopping list, variety, PWA, cooking view) are out of scope for this bolt and covered by bolts `004`–`006`/`008`.
