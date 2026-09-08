---
stage: implement
bolt: 064-dinners-per-week-setting-ui
created: '2026-09-08T20:10:00Z'
---

## Implementation Walkthrough: 005-settings-control

### Summary

An owner-editable "Dinners per week" control on `/settings`, inside the existing Planning week
card, following the pattern `week_start_day` set in bolt 045. Range 1-7, matching the database
`check` exactly.

### Structure Overview

Three layers, each mirroring its `week_start_day` counterpart: a fetch and an update in the
settings API, a query hook and a mutation hook, and a `Select` in the card. Nothing new was
invented; the point of the bolt was to follow an established pattern rather than add a second way
of doing settings.

### Completed Work

- [x] `src/shared/lib/database.types.ts` - regenerated from the **local** stack so the types know
      about `dinners_per_week`
- [x] `src/features/settings/api.ts` - `fetchDinnersPerWeek`, `updateDinnersPerWeek`
- [x] `src/features/settings/hooks.ts` - `useDinnersPerWeek`, `useUpdateDinnersPerWeek`
- [x] `src/features/settings/PlanningWeekCard.tsx` - the control, and the owner hint consolidated
- [x] `src/features/settings/PlanningWeekCard.test.tsx` - 7 cases appended, fixtures extended

### Key Decisions

- **Types regenerated from `--local`, not `--linked`.** Every prior regen in this project came from
  production. This one cannot: the column exists only locally until bolt 063's migration ships. The
  committed types are therefore **ahead of production** for the first time. A routine `--linked`
  regen before that migration is applied would silently revert this and break the build.
- **Inside `PlanningWeekCard`, not a new card.** When the week starts and how many dinners it holds
  are the same subject; a separate card for one number would add a heading and a border to say what
  a dropdown says.
- **`Select` over a number input.** The range is small and closed, so an out-of-range value is
  unreachable by construction rather than rejected by validation.
- **Range 1-7, identical to the database `check`.** Briefly specified as 3-7 and reverted the same
  day - a household planning one dinner a week is coherent, and matching the constraint means there
  is no second rule to keep in step.
- **The mutation invalidates `['weekly-plan']` as well as its own key.** This number decides whether
  the current plan is _full_, which drives the lock control, the plan nudge, and the shopping-list
  and cooking-view gates.

### Deviations from Plan

**One, and it was a bug in my own plan.** The plan said non-owners would get "the existing 'Ask a
household owner to change this.' line, which already covers the card" - then I added a second copy
under the new control anyway. The card rendered the same sentence twice for a member, which reads
as a defect rather than emphasis.

Caught by an existing test failing on `getByText` finding two matches. Fixed by moving the hint to
**card level and rendering it once**, below both controls, where it genuinely does cover the card.
The existing weekday control lost its own copy in the process.

### Dependencies Added

None.

### Developer Notes

- The regenerated types dropped an `__InternalSupabase: { PostgrestVersion: '14.5' }` block that
  the production-generated file carried. The local PostgREST does not report a version for the CLI
  to pin. It is harmless - line 1025's `Omit<Database, '__InternalSupabase'>` is a no-op when the
  key is absent - and a post-deploy `--linked` regen will restore it. Verified `tsc -b` clean.
- The existing `PlanningWeekCard` tests needed `fetchDinnersPerWeek` mocked in their `beforeEach`;
  without it the new query resolves `undefined` and React Query warns on every case. A fixture
  update, not a weakened assertion.
