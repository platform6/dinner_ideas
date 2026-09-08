---
stage: test
bolt: 067-plan-uniqueness-scope
created: '2026-09-08T17:20:00Z'
---

## Test Report: 001-plan-uniqueness-scope

### Summary

- **pgTAP**: ✅ **361 / 361** (20 files) on a clean-slate `supabase db reset` — was 358, +3 from
  this bolt
- **Vitest**: ✅ 317 / 317 — unchanged; no application code was touched
- **`tsc -b`**, **`eslint`**: ✅ clean
- **Live verification**: ✅ all four invariant cases confirmed against production in a rolled-back
  transaction

### Docker was available for the first time

Bolts 001, 007, 009 and 010 all record the same gap — _"could not be executed locally via
`supabase test db` (Docker not running)"_ — and fell back to live SQL against the linked project.
Docker was running this session, so **this is the first bolt in the project to run the pgTAP suite
locally on a full clean-slate migration chain.** The chain now applies 24 migrations and the suite
is green end to end.

### Test Files

- [x] `supabase/tests/database/weekly_planning_test.sql` — one assertion became four; `plan(10)` →
      `plan(13)`
- [x] `supabase/tests/database/weekly_planning_meal_history_test.sql` — stale workaround comments
      corrected (no assertion change)

### What the old test actually asserted

The case this bolt was told to rewrite:

```sql
insert into public.weekly_plans (start_date) values (current_date);
insert into public.weekly_plans (start_date) values (current_date);  -- must fail
'a second unlocked weekly plan is rejected while one already exists'
```

**Both inserts used the same date.** So it passes under the household-wide index _and_ under the
week-scoped one — it never exercised the scope at all. Its name promised "while one already
exists"; its body only ever tested "for the same week".

That is why the suite stayed green for two intents while the rule and the application drifted
apart. The bug was not that a test was wrong; it was that a test was **weaker than its name**, and
nobody re-read the body.

### The four assertions now

| #   | Case                                                  | Expect      | Why                                                  |
| --- | ----------------------------------------------------- | ----------- | ---------------------------------------------------- |
| a   | Same household, **same** week, second draft           | rejected    | Bolt 027's protection, preserved                     |
| b   | Same household, **different** week, second draft      | accepted    | **The outage regression test**                       |
| c   | Draft for a week that already has a **locked** plan   | accepted    | Re-planning; production already contains such a pair |
| d   | `pg_indexes.indexdef` matches the expected definition | exact match | Guards against a silent redefinition                 |

Case (d) is deliberately brittle. An index whose scope can drift unnoticed is exactly what caused
this outage; a test that fails the moment the definition changes is the cheapest possible guard
against a repeat.

### Tests were falsified before being trusted

The migration was sabotaged back to the household-wide definition and the suite re-run:

| Sabotage                                    | Expected to break                                 | Result                      |
| ------------------------------------------- | ------------------------------------------------- | --------------------------- |
| Migration recreates `unique (household_id)` | (b) the regression test, (d) the definition guard | ✅ **Failed test 9 and 11** |
| Restored                                    | —                                                 | ✅ 361 / 361                |

Both assertions have teeth. Without this step the suite's green would have meant nothing, which is
precisely the failure mode that produced the bug being fixed.

### ⚠ A tooling trap found while falsifying — worth knowing

**`supabase test db` does not re-apply migrations.** It runs against whatever state the local
database is already in.

Two falsification attempts appeared to _pass_ with a sabotaged migration, which briefly looked like
the regression test had no teeth. It did; the schema simply had not changed. An explicit
`supabase db reset` between editing a migration and running `supabase test db` is required.

This matters beyond this bolt: anyone editing a migration and running `supabase test db` alone will
see a green suite that never exercised their change. Recorded here because it is exactly how a
migration ships believed-tested and untested.

### Live verification against production

Following bolt 010's pattern — real schema, real data, one transaction, rolled back via a raised
exception:

```text
[1] older-week draft ........................ ACCEPTED
[2] current-week draft WHILE older exists ... ACCEPTED  <- the outage, fixed
[3] second draft, SAME week ................. REJECTED  <- bolt 027 preserved
[4] draft for a week with a LOCKED plan ..... ACCEPTED  <- re-planning allowed
```

Afterwards: 0 stray rows, and `pg_indexes` still reported the **old** single-column definition —
confirming the rollback held and that production remains unmigrated.

An earlier run of this same check collided on `2026-09-06` because a **real** draft for the current
week existed by then. That was not a defect: it was the new index correctly rejecting a same-week
duplicate against live data, and incidental confirmation that the product owner was unblocked after
the story-003 remediation.

### Acceptance Criteria Validation

**Story 001 — scope-index-to-week**

- ✅ Index is `unique (household_id, start_date) nulls not distinct where locked_at is null`
- ✅ Draft for the current week accepted while an older draft exists — (b), and live case [2]
- ✅ Second draft for the same week rejected — (a), and live case [3]
- ✅ Applies without remediation; widening cannot fail on existing data
- ✅ Index comment rewritten to state the rule that now exists

**Story 002 — uniqueness-tests**

- ✅ The old case **rewritten**, not deleted
- ✅ A different-week case added — the one that would have caught this
- ✅ Production scenario reproduced directly
- ✅ Meal-history workaround comments corrected, with the reason recorded rather than erased
- ✅ Nothing in the suite still asserts the household-wide rule

**Story 003 — stale-draft-remediation**

- ✅ Performed 2026-09-08 ahead of the bolt: `bf0206d0…` locked at the product owner's direction
  ("still in active development and don't need solid records yet"). `unlocked_plans` → 0
- ✅ Decision and its side effect recorded — the week of 2026-08-30 now carries 6 `meal_history`
  rows because it already had a locked plan

### Issues Found

**One, in my own tests, caught by running them.** The first version shared `current_date` across
all three new cases. pgTAP runs a file in a single transaction, so plans created by (b) persisted
into (c), which then collided — a false failure from order dependence, not from the migration.
Fixed by giving each case its own future week (+100 / +200 / +300), which also makes them
independent of seed data. The comment in the file explains why the offsets are there, so nobody
"simplifies" them back.

### Not in scope, and deliberately so

`fn_weekly_plans_record_meal_history` dedupes `on conflict (weekly_plan_id, dinner_id)` — per
**plan**, not per week. Two plans for one week therefore write two sets of history, which is why
2026-08-30 now shows six dinners. Whether a week should dedupe history is a separate question from
this bolt's invariant, and folding it into a fix for a live outage would have widened the change.
Recorded in the domain model and in the meal-history suite's comments so it is not lost.

### Notes

- No application code changed. The design predicted a correctly scoped constraint would need none,
  and that held — evidence the scope was the entire problem.
- The migration is **written, not applied** to production. Applying it is Operations' step, with a
  deployment record.
