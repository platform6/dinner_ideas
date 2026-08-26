---
stage: test
bolt: 001-dinner-catalog
created: 2026-08-26T18:08:26Z
---

## Test Report: dinner-catalog

### Summary

- **Constraint Tests**: 4/4 passed
- **Security Tests (RLS)**: 2/2 passed
- **Seed Data Verification**: 6/6 passed
- **Performance Tests**: N/A — no performance testing required at this schema/scale (per `requirements.md` NFR: client-side filtering against a small, already-loaded dataset)

**Execution note**: A pgTAP suite (`supabase/tests/database/dinner_catalog_test.sql`) was written as the durable, re-runnable regression test for this schema, mirroring every check below. It could not be executed locally via `supabase test db` because Docker Desktop is not currently running on this machine. Instead, every assertion was validated directly against the live linked "dinner ideas" project (safe: each negative test is a single statement that fails and auto-rolls-back with no persisted side effects; verified dinner count stayed at 50 throughout).

### Acceptance Criteria Validation

**Story 001-dinner-catalog-schema**
- ✅ `dinners` table exists with name, cuisine_type, cook_time_minutes, rosie_approved, instructions, is_active — Confirmed via successful migration apply + live queries
- ✅ `dinner_ingredients` table exists with dinner_id, name, quantity, unit, category — Confirmed
- ✅ RLS denies unauthenticated (anon) access — `SET ROLE anon` → 0 rows visible
- ✅ RLS allows the authenticated household session — `SET ROLE authenticated` → all 50 rows visible

**Story 002-seed-healthy-family-dinners**
- ✅ At least 50 dinners exist — Confirmed: 50
- ✅ Every dinner's cook time ≤ 45 minutes — Confirmed: range is 20–45
- ✅ Every dinner has cuisine type + ingredients with quantity/unit/category — Confirmed: 284 ingredient rows, all satisfying the category check constraint (schema-enforced)
- ✅ Roughly half (just over) marked Rosie-approved — Confirmed: 31/50 (62%)
- ✅ Seed migration is idempotent — Confirmed: manually re-ran the insert pattern for dinner #1; no duplicate dinner or ingredient rows were created

### Constraint Tests (detail)

| Test | Expected | Result |
|------|----------|--------|
| Insert dinner with `cook_time_minutes = 0` | Rejected (check constraint) | ✅ Rejected — `dinners_cook_time_minutes_check` |
| Insert ingredient with `quantity = 0` | Rejected (check constraint) | ✅ Rejected — `dinner_ingredients_quantity_check` |
| Insert ingredient with invalid `category` | Rejected (check constraint) | ✅ Rejected — `dinner_ingredients_category_check` |
| Insert dinner with duplicate `name` | Rejected (unique constraint) | ✅ Rejected — `dinners_name_key` |

### Issues Found

None. All constraint, RLS, and seed-data checks passed on the first run.

### Recommendations

- Get Docker Desktop running in this dev environment so `supabase test db` can execute the pgTAP suite locally (and eventually in CI) instead of relying on ad hoc checks against the live project.
- Consider a CI workflow that runs `supabase db push --dry-run` (or `db diff`) plus `supabase test db` on every PR touching `supabase/migrations/`.
