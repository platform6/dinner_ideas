---
stage: test
bolt: 069-servings-setting
created: '2026-09-11T17:44:41Z'
---

## Test Report: 001-serving-size-setting

### Summary

- **Unit + component (Vitest)**: **628/628** project-wide, **+11** in this bolt
- **Database (pgTAP)**: **411/411** across 22 files, **+17** in the new `servings_per_dinner_test.sql`,
  run against a real local Postgres with the migration applied
- **Security**: RLS proven by behaviour in pgTAP (owner writes, member's write filtered, other
  household blind), not by reading policy text
- **Performance**: n/a. One extra column on an existing one-row-per-household read
- **Coverage**: no coverage tooling in this project (`coding-standards.md`: "no formal percentage").
  Counts are reported instead
- **Gates**: `tsc -b` ✅ · `eslint .` ✅ (0 errors; the one warning is the pre-existing `any` in
  `claude-proxy/anthropic.ts`) · `prettier` ✅

### Test Files

- [x] `supabase/tests/database/servings_per_dinner_test.sql` (17, new): shape, default, both edges
      of 1..12, RLS by behaviour, the ADR-14 comment, and the absence of any trigger reacting to the
      column
- [x] `src/features/settings/RecipesCard.test.tsx` (8, new): stored value, exact range, a
      non-default value, the self-explanation, its own card, the non-owner path, save failure, and
      invalidating **only its own query**
- [x] `src/features/recipe-entry/components/RecipeEntryPage.test.tsx` (58, **+2, 2 rewritten**):
      every test now runs with a household of **5**; guidance, caveat and prompt all carry 5
- [x] `src/features/recipe-entry/import/prompt.test.ts` (29, **+1, 1 rewritten**): the rule names
      the household's number, not 3, and describes no particular family
- [x] `extract.test.ts`: call sites only (a new required argument); no behaviour change

### Acceptance Criteria Validation

**001-servings-column**

- ✅ The column exists, `smallint not null default 3`, with `check (between 1 and 12)`: pgTAP,
  and inspected directly on the local database after `migration up`
- ✅ Existing households are unchanged: the default of 3 is asserted, and a new household gets it
- ✅ Existing RLS applies with no new policy: owner update lands, a member's update changes nothing,
  another household cannot read the row

**002-servings-setting-control**

- ✅ An owner sees and changes the value; it persists and is read back
- ✅ It explains what the number is for, ending _"Changing it never alters recipes you've already
  saved"_ (ADR-14, said where the change is made)
- ✅ A non-owner gets the same treatment as the other settings: disabled, one owner hint

**003-no-more-hardcoded-three**

- ✅ Guidance names N: _"Enter quantities for 5 — the number your household cooks for."_
- ✅ The prompt carries N: asserted on the **actual request sent to the proxy**, not only on the
  prompt builder
- ✅ No user-visible "3 servings" remains: the grep at Stage 4 found exactly 3 source sites and
  3 test sites, all known, and all changed
- ✅ Asserted on **rendered** text with the setting **≠ 3**. A household of 3 would render
  identical text through a surviving literal, so every page test runs with 5

### The assertions were checked by breaking the code

Running a test and seeing it pass says nothing about whether it would fail on the defect it is
meant to catch. Three were sabotaged, each on its own, and each failed as intended:

1. **RLS**: in a rolled-back transaction, a permissive "any member may update" policy was added.
   The member's write then landed (**9**), where the test expects the owner's **5**, so the pgTAP
   assertion would fail.
2. **ADR-14 in the UI**: the servings mutation was made to also invalidate `['weekly-plan']`.
   `RecipesCard > invalidates ONLY its own query` failed.
3. **FR-6**: the guidance was set back to _"— two adults and one small child."_
   `RecipeEntryPage > no longer says 3 servings or describes a particular family` failed.

All three were restored and the full suite re-run green.

### Issues Found

**None in this bolt's code.** Two findings along the way:

**1. A unit 001 test changed, on purpose, as the design said it would.** `RecipeEntryPage > states
the 3-serving convention` asserted the exact copy this intent removes. It was rewritten, not
deleted, as two tests: one for the guidance with N, and one for the **absence** of the old wording.
Bolt 062's "unit 001 tests pass unmodified" rule belonged to that bolt.

**2. The earlier prompt test passed by coincidence.** `prompt.test.ts > names the 3-serving
convention` kept passing after the change because the new `SERVINGS` fixture happens to be 3. It
proved nothing about reading the setting. It now builds the prompt with 5 and asserts both the 5
and the absence of 3. This is the same failure mode, a test too weak to fail, that the construction
logs have been tracking since bolt 059.

### Recommendations

- **Deploy the migration before the frontend (ADR-9).** The frontend selects `servings_per_dinner`.
  The migration is additive and nothing calls it until the FE ships, which is the same safe order
  as v0.14.0.
- **Bolt 070 removes the parameterised rescaling rule** that this bolt introduced. It exists only so
  069 is correct if shipped alone.
- The local stack was started for this bolt (Docker Desktop was not running) and left running.
