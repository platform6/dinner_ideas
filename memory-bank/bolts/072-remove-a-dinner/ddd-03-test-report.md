---
stage: test
bolt: 072-remove-a-dinner
created: '2026-09-11T18:25:23Z'
---

## Test Report: 003-remove-a-dinner

### Summary

- **Database (pgTAP)**: **446/446** across 23 files, **+35**: the new
  `remove_dinner_test.sql` (30) and `advisor_hardening_test.sql` (+5). All **411 pre-existing
  tests pass against the restated selections guard**
- **Unit + component (Vitest)**: **725/725**, **+18**
- **Security**: household isolation, a definer function's pinned `search_path`, `anon` locked out,
  and the guard escape's narrowness, all asserted by behaviour
- **Performance**: n/a. A single-row removal and four indexed counts
- **Coverage**: no coverage tooling in this project; counts reported instead
- **Gates**: `tsc -b` ✅ · `eslint .` ✅ (0 errors; the pre-existing Edge Function warning) ·
  `prettier` ✅

### Test Files

- [x] `supabase/tests/database/remove_dinner_test.sql` (30, new): every situation a dinner can
      be in, built with **real** history (plans locked through the real lock trigger)
- [x] `supabase/tests/database/advisor_hardening_test.sql` (+5): `fn_remove_dinner` is pinned,
      definer and closed to `anon`; `fn_dinner_removal_impact` is pinned and invoker
- [x] `src/features/dinners/components/RemoveDinnerDialog.test.tsx` (15, new): impact-first,
      Cancel focus, only the lines that apply, the locked refusal, the three failure messages, and an
      impact failure
- [x] `src/features/dinners/components/DinnerCard.test.tsx` (+3): menu order and distinction,
      opening without acting, and "Not interested instead" routing to the reversible hide

### Acceptance Criteria Validation

**001-remove-a-dinner**

- ✅ The dinner, its ingredients, steps and tag links are all deleted, with no orphans (four
  separate counts)
- ✅ **Atomic**: the refused case changes nothing, checked by counting the dinner, its selection and
  its history after the refusal
- ✅ **The name is reusable**: the same name is re-inserted after removal
- ✅ **RLS**: another household gets `P0002` for both removal and impact, and the dinner is untouched
- ✅ **The shared tags survive**: the tag row remains; only the link went
- ✅ **Items survive** (ADR-7): both registry rows remain after their ingredients are removed

**002-confirm-before-removing**

- ✅ Confirmed before anything is deleted: the menu only opens the dialog, and `removeDinner` is not
  called
- ✅ A dinner with history or in a plan says what it affects, and removal proceeds (warn, don't
  refuse)
- ✅ It is clear the removal cannot be undone: "This can't be undone." is always shown
- ✅ "Not interested" stays the non-destructive option: it comes first in the menu, is named in every
  dialog, and "Not interested instead" routes to the same reversible hide
- ⚠️ **One refusal, flagged**: a dinner in **this week's locked plan** is refused until the week ends
  (ADR-15). This narrows Checkpoint 2 and needs the product owner to confirm it

**003-removal-tests**

- ✅ pgTAP: all four child row types go, with no orphans
- ✅ pgTAP: the shared vocabulary survives
- ✅ pgTAP: another household's dinner cannot be removed
- ✅ UI: confirmation is required, and a dinner with history shows its warning

### Stage 4 verification changed the implementation

The design stage listed five assumptions it could not check without reading code. Checked against the
real schema: **four held and one did not.** The selections guard raises on _any_ delete from a locked
plan, including every past week's. The design had anticipated exactly this. The guard gained a
narrow, transaction-local escape: DELETE only, only with `app.dinner_removal` set, and only for a
**ended** week. Its narrowness is asserted by three tests.

### The guards were checked by breaking the code

Three sabotages were applied to the live local database. Each was restored by re-applying the
(idempotent) migration:

1. **The locked-plan refusal removed from `fn_remove_dinner`.** The refusal test failed. The detail
   worth recording is _how_: the call still failed, with the **guard's** "cannot modify selections of
   a locked weekly plan", because the escape's week-ended condition refused on its own. **The second
   guard works independently of the first.** The locked plan kept its dinner either way.
2. **`fn_remove_dinner` switched to `security invoker`.** The advisor test caught it, and removing a
   cooked dinner **died with `23503`**: under RLS the history deletes silently matched nothing, so the
   foreign key refused the dinner. That is precisely why the function is `definer`.
3. **The guard's escape widened** (week-ended condition dropped). "Even WITH the flag, this week's
   locked plan cannot lose a selection" got **no exception** and failed.

All three were restored, and the full pgTAP suite re-run green.

### Issues Found

**1. `useRemoveDinner` passed React Query's context into an API function.** It was written as
`mutationFn: removeDinner`, so React Query v5's second `mutationFn` argument leaked into
`removeDinner`. It was harmless because the function ignores it, but it was caught by a test that
checked the exact call. It is now wrapped like the file's other mutations.

**2. A formatter sweep reformatted eleven files this bolt never touched.** `prettier --write` over
`src/features/dinners` reformatted pre-existing, unformatted files. All eleven were reverted before
commit so this bolt's diff contains only its own changes. Worth knowing: part of that folder is not
Prettier-clean, and the pre-commit hook only formats _staged_ files, so it will stay that way until
someone formats it on purpose.

### Recommendations

- **The product owner should confirm or overturn the locked-plan exception** (ADR-15, decision 4).
  It is the one place intent 018's construction narrowed an explicit Checkpoint 2 decision.
- **Deploy order**: migration `20260911181346` before the frontend (ADR-9). It adds two functions and
  restates one trigger function. Nothing on the live site calls the new functions until the frontend
  ships. The restated guard is behaviourally identical for every existing caller (411 tests).
- **Live check**: removing the bark on production is a real test of the whole path and fixes the
  catalog's one known-wrong recipe (NFR-1's route).
