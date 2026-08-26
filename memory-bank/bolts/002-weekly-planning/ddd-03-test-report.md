---
stage: test
bolt: 002-weekly-planning
created: 2026-08-26T19:33:16Z
---

## Test Report: weekly-planning

### Summary

- **Invariant Tests**: 5/5 passed
- **Security Tests (RLS)**: 2/2 passed
- **View Correctness**: 1/1 passed (`dinner_last_chosen`)
- **Performance Tests**: N/A — trivial data volume at this scale, per `requirements.md` NFRs

**Execution note**: Same situation as bolt `001-dinner-catalog` — Docker Desktop isn't running locally, so `supabase test db` couldn't execute the pgTAP suite (`supabase/tests/database/weekly_planning_test.sql`, written for future local/CI use). Every check below was instead run directly against the live "dinner ideas" project, using real insert/lock/delete calls, then cleaning up the test rows afterward (both tables verified empty again post-cleanup).

### Acceptance Criteria Validation

**Story 001-weekly-plan-schema**
- ✅ `weekly_plans` table exists with `start_date`, `locked_at`, `created_at`
- ✅ `weekly_plan_selections` table exists, referencing `weekly_plans` and `dinners`
- ✅ RLS denies unauthenticated (anon) access — 0 rows visible
- ✅ RLS allows the authenticated household session — all rows visible

**Story 002-enforce-exactly-three-immutable**
- ✅ A plan never holds more than 3 selections — 4th insert attempt rejected ("already has 3 selections; remove one before adding another")
- ✅ A plan can't lock with the wrong count — lock attempt on a 1-selection plan rejected ("must have exactly 3 selections to lock (found 1)")
- ✅ Selections can be freely added/removed while unlocked — verified a full swap (remove one, add a different one) succeeded
- ✅ A locked plan's selections can't be modified — delete attempt on a locked plan's selection rejected ("cannot modify selections of a locked weekly plan")
- ✅ A locked plan's own fields can't change — direct `UPDATE` of `start_date` on a locked plan rejected ("is locked and cannot be modified")
- ✅ Re-locking an already-locked plan is idempotent — returned the same row (same `locked_at`), no error

**Story 003-last-chosen-query**
- ✅ `dinner_last_chosen` reflects locked plans only — the 3 dinners in the locked plan showed `last_chosen_date = 2026-08-31`; a 4th dinner that was swapped **out** before locking correctly showed `null` ("never chosen"), confirming unlocked/removed selections don't count toward history
- ✅ Dinners never selected at all also correctly show `null`

### Detail Table

| Test | Expected | Result |
|------|----------|--------|
| Insert 4th selection on a plan with 3 | Rejected (max-3 trigger) | ✅ Rejected |
| Swap: remove 1, add a different 1, while unlocked | Allowed | ✅ Succeeded |
| Lock a plan with 1 selection | Rejected (exactly-3 trigger) | ✅ Rejected |
| Lock a plan with 3 selections | Succeeds, `locked_at` set | ✅ Succeeded |
| Delete a selection from a locked plan | Rejected (immutability trigger) | ✅ Rejected |
| Update a field on a locked plan | Rejected (immutability trigger) | ✅ Rejected |
| Lock an already-locked plan again | No-op success, same row returned | ✅ Idempotent |
| `dinner_last_chosen` for a swapped-out (never-locked-in) dinner | `null` | ✅ `null` |
| `anon` role reads `weekly_plans` | 0 rows | ✅ 0 rows |
| `authenticated` role reads `weekly_plans` | All rows | ✅ All rows |

### Issues Found

None. Every invariant, lock-flow, and RLS check passed on the first run.

### Recommendations

- Same as bolt `001-dinner-catalog`: get Docker Desktop running so `supabase test db` can execute both pgTAP suites locally/in CI going forward, rather than relying on manual live-DB verification for every bolt.
