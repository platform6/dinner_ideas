---
stage: test
bolt: 006-weekly-dinner-planner-ui
created: 2026-08-26T22:32:58Z
---

## Test Report: weekly-dinner-planner-ui (bolt 4 of 4 original; final polish)

### Summary

- **Tests**: 56/56 passed (15 new for this bolt; 41 carried over, all still green)
- **Coverage**: No formal percentage (per `coding-standards.md`) — date-math boundaries and sort logic are exactly the "genuinely risky" territory the standards call out; PWA artifacts are verified by inspecting build output rather than app-logic unit tests (see Notes).

### Test Files

- [x] `src/features/dinners/last-chosen.test.ts` — unit tests for `daysSince`, `formatLastChosen` (Never made / Made today / singular-plural day-week-month-year boundaries), `daysSinceForSort`
- [x] `src/features/dinners/filters.test.ts` — extended with variety-sort tests: least-recently-made-first ordering, all-tied-at-never-made falls back to alphabetical, cook-time sort still takes priority when both could apply
- [x] `src/features/dinners/components/CatalogPage.test.tsx` — extended with two tests: "Last made ..." text renders when a date is present, "Never made" renders when a dinner is absent from the map

### Acceptance Criteria Validation

From `implementation-plan.md`:

- ✅ **A dinner chosen in a past locked plan shows "Last made N ... ago"**: Verified — `last-chosen.test.ts`, `CatalogPage.test.tsx`
- ✅ **A never-chosen dinner shows "Never made"**: Verified — both files above
- ✅ **Default order (no cook-time sort) surfaces not-recently-made dinners first**: Verified — `filters.test.ts`
- ✅ **Recently-made dinners remain fully selectable**: Verified structurally — the sort/display changes never touch `selectionDisabled`, which is driven only by the 3-picked count (bolt 004)
- ✅ **Installable manifest + service worker with valid icons**: Verified by inspecting `pnpm run build` output — `dist/manifest.webmanifest` (name, icons, `display: "standalone"`), `dist/sw.js` generated
- ✅ **Current shopping list viewable offline after an online visit**: Verified by inspecting `dist/sw.js` — contains the `NetworkFirst` / `supabase-rest-cache` runtime-caching rule for Supabase REST calls
- ✅ **Installed app launches full-screen**: Verified — manifest's `"display":"standalone"`
- ✅ **First-ever offline visit shows a clear message**: No app-specific handling needed — see Developer Notes on `implementation-walkthrough.md`; this is the browser's native offline page, which the story explicitly accepts

### Issues Found

**Real bug caught by the new tests, not just a test-authoring slip**: the variety-sort comparator computed `bDays - aDays` directly. When both dinners are "never made" (`daysSinceForSort` returns `Infinity` for each), `Infinity - Infinity` evaluates to `NaN`, not `0` — so the `diff !== 0` check was always true and the intended alphabetical tie-break never ran. In practice this meant "all never-made" (the common case for a freshly-seeded catalog) silently fell back to array-insertion order instead of alphabetical. Fixed by comparing `aDays !== bDays` before subtracting, rather than checking the subtraction result.

### Notes

- PWA behaviors that require a real browser (actual install prompts, live service-worker lifecycle, true offline network conditions) aren't exercised by jsdom/Vitest — verified instead via build-output inspection (manifest contents, `dist/sw.js` containing the expected caching rule), which is the appropriate check for this kind of build-tooling configuration versus app logic.
- `pnpm run lint`, `pnpm exec tsc -b`, and `pnpm run build` all pass clean.
