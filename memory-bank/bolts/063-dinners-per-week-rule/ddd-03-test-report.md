---
stage: test
bolt: 063-dinners-per-week-rule
created: '2026-09-08T19:20:00Z'
---

## Test Report: 001-dinners-per-week-model

### Summary

- **pgTAP**: ✅ **370 / 370** (20 files) on a clean-slate `supabase db reset` — was 361, **+9**
- **Vitest**: unchanged at 317/317 — this bolt ships no application code
- **`tsc -b`**, **`eslint`**: unaffected

### Test Files

- [x] `supabase/tests/database/weekly_planning_test.sql` — `plan(13)` → `plan(22)`; two existing
      assertions retitled, nine added
- [x] `supabase/tests/database/advisor_hardening_test.sql` — its assertion for the renamed function
      repointed. **This file was not in the bolt's plan** — see below

### The file the plan did not know about

Stage 5 began with the suite **aborting**, not failing:

```text
advisor_hardening_test.sql   (Wstat: 768 (exited 3) Tests: 2 Failed: 0)
```

`supabase/tests/database/advisor_hardening_test.sql` asserts `proconfig` on all six functions
hardened by `20260831120000`, addressing each by `regprocedure`. Renaming
`fn_weekly_plans_require_three_on_lock` made that cast reference a function that no longer exists,
which raises rather than fails — so the file aborted and took its remaining assertions with it.

Repointed at `fn_weekly_plans_require_n_on_lock`, with a comment explaining that the pin must
survive the rename.

**This corrected ADR-12.** Its first draft claimed the `search_path` regression would be silent
"because the hardening had no test". That was false — the test existed and this bolt tripped over
it. The ADR now records the correction explicitly rather than being quietly edited, because an ADR
that overstates a risk leaves the next reader with a threat model the repository does not match.
The migration header carried the same wrong claim and was corrected too.

The mechanism remains real and worth the ADR; the blast radius is "a test fails and you fix it",
not "a security fix disappears unnoticed".

### The nine new assertions

| #   | Case                                    | Asserts                                             |
| --- | --------------------------------------- | --------------------------------------------------- |
| a1  | `dinners_per_week` default              | `3` — the deploy is a no-op for existing households |
| a2  | Value `8`                               | rejected, `23514` — a week has seven days           |
| a3  | Value `0`                               | rejected, `23514`                                   |
| b1  | Five selections at N=5                  | **accepted** — the feature                          |
| b2  | Sixth selection at N=5                  | rejected — the cap follows the setting              |
| c   | Lock at exactly 5, N=5                  | accepted, **and `meal_history` gets 5 rows**        |
| d   | Setting lowered under a plan            | every pick survives; locking refuses                |
| f   | `fn_weekly_plans_require_three_on_lock` | **gone**, not shadowed                              |
| g   | `for update` still in the guard's body  | the `20260827002830` race fix                       |

Two existing assertions were **retitled, not replaced**: their names claimed "max-3" and "exactly
3", which after this bolt describe only the default. They still exercise the default, which is
worth keeping — the non-default cases are what prove the setting is read.

### Assertion (g) is a proxy, and says so

True multi-session concurrency cannot be exercised from a single pgTAP transaction. The
`20260827002830` guarantee — two racing inserts, exactly one winner — is therefore **not** directly
tested here, by this bolt or by any before it.

What (g) does is assert the `for update` is still present in the function's source. That catches
the realistic failure (someone rewrites the body and drops the serialisation) without pretending to
be a race test. Labelled as a source-level guard in the file so nobody later mistakes it for one.

### Tests were falsified before being trusted

Two sabotages in one run, against a **`db reset`** (mandatory — `supabase test db` alone does not
re-apply migrations):

| Sabotage                         | Expected to break       | Result                                |
| -------------------------------- | ----------------------- | ------------------------------------- |
| Cap reverted to literal `3`      | the non-default-N cases | ✅ Failed tests 15 and 17             |
| `set search_path` clause removed | the ADR-12 guard        | ✅ Failed `advisor_hardening_test` #4 |
| Restored                         | —                       | ✅ 370 / 370                          |

The second is the one that matters: it proves the ADR-12 mitigation is load-bearing, and it is how
the ADR's overstated claim was caught.

### Functional check at N=5, clean-slate local

```text
[1] added 5 selections at N=5 ............. OK
[2] 6th selection ......................... REJECTED:
      "weekly plan … already has 5 selections; remove one before adding another"
[3] locked at exactly 5 ................... OK
    meal_history rows written: 5
```

The message names the real limit. `meal_history` wrote five rows with **no change to that
function** — confirming the domain model's claim that it was always N-agnostic and needed only its
comment corrected.

### `search_path` verified after the replace

| Function                                | `proconfig`                                     |
| --------------------------------------- | ----------------------------------------------- |
| `fn_weekly_plan_selections_guard`       | `search_path=""` — replaced, restated           |
| `fn_weekly_plans_require_n_on_lock`     | `search_path=""` — new, stated                  |
| `fn_weekly_plans_record_meal_history`   | `search_path=""` — untouched, `ALTER` preserved |
| `lock_weekly_plan`                      | `search_path=""` — untouched                    |
| `fn_weekly_plans_require_three_on_lock` | absent — dropped                                |

### Acceptance Criteria Validation

**Story 001 — dinners-per-week-column**

- ✅ `smallint not null default 3 check (between 1 and 7)`
- ✅ Existing households take the default; no data migration
- ✅ No new RLS policy
- ✅ `comment on column` in the house style

**Story 002 — selection-cap-honours-setting**

- ✅ Selection N accepted, N+1 rejected, at a non-default N
- ✅ The message states the actual limit
- ⚠️ **Concurrency**: the `for update` is unchanged and asserted present in source, but a true
  two-session race is not exercised — see above
- ✅ Read from the **plan's** household via a join, not the caller's session

**Story 003 — lock-honours-setting**

- ✅ Locks at exactly N; rejected below and above
- ✅ Above-N refusal says how many picks to remove
- ✅ Function renamed; old name dropped and proven absent
- ✅ Meal-history comment corrected via `comment on`, not `create or replace`

**Story 004 — rule-tests**

- ✅ Cases at a non-default N
- ✅ Existing assertions updated, not deleted
- ✅ Meal-history proven N-agnostic at N=5
- ⚠️ The concurrency case is a source-level proxy, stated as such

### Issues Found

**Two, both mine, both caught by running the suite.**

1. `advisor_hardening_test.sql` aborted on the rename — the bolt's plan did not know that file
   existed. Fixed, and it corrected ADR-12 as described above.
2. `is()` compared `information_schema.column_default` (type `character_data`) against `text` and
   the file aborted on a type error. Fixed with an explicit cast.

Neither would have been found by reading. Both are arguments for running the suite before believing
the work is done.

### Not in scope

- **The other four hardened functions** (`lock_weekly_plan`,
  `fn_weekly_plans_block_edit_after_lock`, `fn_weekly_plans_record_meal_history`,
  `reorder_grocery_store_row`) are already guarded by `advisor_hardening_test.sql`. Nothing to add
  — the earlier concern that they were unguarded was part of the mistaken premise.
- **Client screens** — unit 002. This bolt ships no application code.
- **The `/settings` control** — bolt 064.

### Notes

- The migration is **written, not applied** to production. Applying it is Operations' step.
- `supabase test db` does not re-apply migrations; `supabase db reset` first. Stated again here
  because it caused two invalid falsification runs in bolt 067 and would have caused more here.
