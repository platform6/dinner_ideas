---
id: 026-household-data-model
unit: 001-household-data-model
intent: 004-account-model
type: ddd-construction-bolt
status: planned
stories:
  - 001-household-profile-membership-schema
  - 002-current-household-helper
created: '2026-08-28T00:00:00Z'
requires_bolts: []
enables_bolts:
  - 027-household-data-model
  - 031-account-model-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 026-household-data-model

## Objective

Lay the identity + household foundation: the `profiles`, `households`, and `household_members`
tables with their RLS, and the `current_user_household_id()` helper that every later policy and
column default depends on. Nothing here touches an existing table.

## Stories Included

- [ ] **001-household-profile-membership-schema**: `profiles` / `households` / `household_members`
      tables + RLS + one-household-per-user `unique (profile_id)` — Priority: Must
- [ ] **002-current-household-helper**: `current_user_household_id()` — `stable` / `security
    definer`, `search_path` pinned, returns caller's household or null — Priority: Must

## Expected Outputs

- New migration(s) under `supabase/migrations/` creating the three tables, their indexes,
  RLS policies, and the helper function
- `supabase/tests/database/` cases: membership isolation (own vs co-member vs other household),
  helper returns correct id / null, helper is `stable`
- DDD artifacts: `ddd-01-domain-model.md`, `ddd-02-technical-design.md`, `ddd-03-test-report.md`

## Dependencies

### Bolt Dependencies (within intent)

- None — first bolt of the intent

### Unit Dependencies (cross-unit)

- `001-weekly-dinner-planner` — complete (owns `auth.users` usage today)

### Enables

- `027-household-data-model` (needs `current_user_household_id()` for column defaults)
- `031-account-model-ui` (needs `household_members` / `profiles` for the `useAuth` context query)

## Success Criteria

- [ ] Three tables exist with RLS enabled and the policies from story `001`
- [ ] `current_user_household_id()` returns the caller's household id, `null` when unmembered
- [ ] `unique (profile_id)` blocks a second membership row
- [ ] Isolation test green; `supabase db reset` applies cleanly
- [ ] DDD stages complete; code reviewed

## Notes

`002` can be defined before or alongside `001` in the same migration set — story `001`'s RLS
references the helper, so land the function no later than the policies. No existing table is
modified in this bolt, so it is safe to ship independently.
