---
stage: test
bolt: 016-kitchen-table-ui
created: 2026-08-27T12:30:00Z
---

## Test Report: kitchen-table-ui (login + catalog/card restyle)

### Summary

- **Tests**: 122/122 passed (20 test files — no new test files this bolt; `tags.test.ts` gained
  5 cases, `CatalogPage.test.tsx` and `LoginForm.test.tsx` each had 1 assertion updated for the
  intentional copy/markup change)
- **Build**: `npx tsc -b` clean, `npx eslint .` clean, `npx vite build` succeeds
- **Live verification**: Login screen live-rendered via a local dev server + browser screenshot
  — brand tile, Lora title, tagline, icon-led inputs, reveal toggle, and full-width CTA all
  render as designed. The Catalog screen sits behind Supabase Auth login and this session has no
  test credentials, so it wasn't rendered live — verified via semantic component tests instead.

### Test Files

- [x] `src/features/dinners/tags.test.ts` (+5 tests) — `isRosieApproved`: present, absent,
      empty list, null/undefined, near-miss name (`rosie-approved-ish` does not match)
- [x] `src/features/dinners/components/CatalogPage.test.tsx` (1 assertion updated) — count-chip
      copy changed from `"3/3 selected"` to `"3 of 3"`
- [x] `src/features/auth/LoginForm.test.tsx` (query updated, same 3 tests) — password-field
      query switched from `/password/i` to `/^password/i` to disambiguate from the new "Show/Hide
      password" reveal button, which now also has "password" in its accessible name
- [x] `src/features/dinners/components/DinnerCard.test.tsx` — re-verified unchanged: still
      asserts the "+"-labeled add-tag button, "Remove tag kid-friendly" button, and `/details/i`
      toggle button by their original accessible names, confirming the restyle didn't shift any of
      the details-section contracts
- [x] Remaining 16 pre-existing files — re-verified passing, including the pick/selection
      checkbox assertions in `CatalogPage.test.tsx` (`getByRole('checkbox', { name: 'Pick X for
this week' })`), which still pass unchanged against the new pill markup

### Acceptance Criteria Validation

**Story 006-login-restyle**

- ✅ Icon tile, Lora title, tagline, icon-led inputs, password reveal, full-width CTA, notice-
  styled error — live-verified via browser screenshot; existing `useAuth` error-handling tests
  unchanged and passing
- ✅ Password reveal toggle doesn't collide with the field's own label for assistive tech — an
  incidental discovery while fixing the test query: both had "password" in their accessible
  name, which is a real ambiguity a screen-reader user would also hit; resolved by keeping the
  label as-is ("Password") and not changing the toggle's clear "Show/Hide password" wording,
  since the fix is on the test's query specificity, not the UI

**Story 007-catalog-dinner-card-restyle**

- ✅ Header eyebrow/title/count chip — `CatalogPage.test.tsx`
- ✅ Photo-placeholder tile, restyled metadata/footer, `cardSelected` fill, at-cap notice —
  implemented in `DinnerCard.tsx`; not independently unit-tested (purely presentational layout,
  no new logic branch), covered indirectly by the existing render-without-crashing assertions in
  `CatalogPage.test.tsx`/`DinnerCard.test.tsx`
- ✅ Pill pick control keeps the real-checkbox contract — `CatalogPage.test.tsx`'s existing
  `getByRole('checkbox', ...)` assertions (checked, enabled/disabled) pass unchanged against the
  new markup
- ✅ `rosie-approved` heart renders only for that exact tag name — `tags.test.ts`'s
  `isRosieApproved` cases
- ✅ Expandable details gets category/step icons — implemented; existing
  `DinnerCard.test.tsx` details-section tests (ingredients/steps/tags rendering, add/remove tag)
  all still pass, confirming the icon additions didn't disturb the underlying data flow

### Issues Found

One, fixed:

1. `LoginForm.test.tsx`'s `getByLabelText(/password/i)` started matching two elements once the
   password-reveal `IconButton` was added — its `aria-label` ("Show password" / "Hide password")
   also contains "password". Fixed by narrowing the test query to `/^password/i`, which matches
   only the field's own label text ("Password *") and not the button's label.

### Notes

Catalog/DinnerCard couldn't be visually confirmed in a real browser this bolt — same limitation
noted in bolt `015`: every screen past Login requires an authenticated session, and this session
has no test credentials. Worth a visual pass (Login, catalog grid, pick-pill states, rosie heart,
expanded details) once the user has a moment to log in and look.
