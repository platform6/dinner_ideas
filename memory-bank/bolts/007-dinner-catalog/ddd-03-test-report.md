---
stage: test
bolt: 007-dinner-catalog
created: 2026-08-26T23:00:51Z
---

## Test Report: dinner-catalog (follow-up: cooking steps)

### Summary

- **Constraint Tests**: 2/2 passed
- **Security Tests (RLS)**: 2/2 passed
- **Seed Data Verification**: 4/4 passed
- **Idempotency**: 1/1 passed
- **Performance Tests**: N/A — trivial volume (~300 rows), no performance testing warranted at this scale

**Execution note**: A pgTAP suite (`supabase/tests/database/dinner_catalog_steps_test.sql`) was written as the durable, re-runnable regression test, mirroring every check below. It could not be executed locally via `supabase test db` because Docker is not currently running on this machine (same limitation noted in `001-dinner-catalog`'s test report). Every assertion below was instead validated directly against the live linked "dinner ideas" project — each negative test is a single statement that fails and leaves no residue (confirmed: `dinner_steps` count stayed at 216 throughout).

### Acceptance Criteria Validation

**Story 003-dinner-step-by-step-instructions**

- ✅ `dinner_steps` table exists with a dinner reference, step number, and instruction text — Confirmed via successful migration apply + live schema/column checks
- ✅ Querying a dinner's steps ordered by step number returns a sensible, ordered sequence of discrete actions — Confirmed: spot-checked "Turkey Taco Bowls" (4 steps, correctly ordered 1–4, each a distinct imperative action)
- ✅ Every one of the 50 seed dinners has at least 2 steps — Confirmed: `dinners_missing_steps = 0`, `dinners_under_2_steps = 0`, 216 total steps across 50 dinners
- ✅ RLS denies unauthenticated access; the authenticated household session succeeds — Confirmed: `SET ROLE anon` → 0 visible rows; `SET ROLE authenticated` → 216 visible rows

### Constraint Tests (detail)

| Test | Expected | Result |
|------|----------|--------|
| Insert step with `step_number = 0` | Rejected (check constraint) | ✅ Rejected — `dinner_steps_step_number_check` |
| Insert duplicate `(dinner_id, step_number)` | Rejected (unique constraint) | ✅ Rejected — `dinner_steps_dinner_id_step_number_key` |

### Idempotency

Re-ran the seed migration's insert statements directly against the live project (extracted just the `dinner_steps` upserts, skipping the one-time `CREATE TABLE`/policy statements). Result: `total_steps` unchanged at 216 — no duplicate rows, confirming the `ON CONFLICT (dinner_id, step_number) DO UPDATE` upsert behaves as designed.

### Issues Found

None. All constraint, RLS, seed-coverage, and idempotency checks passed on the first run.

### Recommendations

- Same as `001-dinner-catalog`: get Docker running in this dev environment so `supabase test db` can execute the pgTAP suite locally (and eventually in CI).
- When bolt `008-weekly-dinner-planner-ui` (cooking view) is implemented, verify the documented embedded-and-ordered query shape (`select=*,dinner_steps(*)&dinner_steps.order=step_number.asc`) returns steps in the expected order from the client, not just via direct SQL.
