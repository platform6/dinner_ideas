---
id: 031-account-model-ui
unit: 002-account-model-ui
intent: 004-account-model
type: simple-construction-bolt
status: planned
stories:
  - 001-useauth-household-context
  - 002-insert-site-audit-and-types-regen
created: '2026-08-28T00:00:00Z'
requires_bolts:
  - 028-household-data-model
enables_bolts: []
requires_units:
  - 001-household-data-model
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 031-account-model-ui

## Objective

Wire the frontend to the household-scoped schema: `useAuth` exposes `profile` / `householdId` /
`role`, the one changed insert site (`category_row_assignments` upsert) is fixed, and
`database.types.ts` is regenerated. No new screens.

## Stories Included

- [ ] **001-useauth-household-context**: post-session query for profile + membership; new
      `profile` / `householdId` / `role` on `UseAuthResult`; refetch on auth change; clear on
      sign-out — Priority: Must
- [ ] **002-insert-site-audit-and-types-regen**: audit the 12 Supabase call sites;
      `assignCategory` upsert → `onConflict: 'household_id,category'` + pass `householdId`;
      regenerate `src/shared/lib/database.types.ts`; keep the suite green — Priority: Must

## Expected Outputs

- `src/features/auth/useAuth.ts` + `useAuth.test.ts`
- `src/features/store-config/api.ts` + `hooks.ts` (thread `householdId`) + tests
- `src/shared/lib/database.types.ts` (regenerated)
- Updated test fixtures/mocks for the new tables/columns
- `implementation-plan.md`, `implementation-walkthrough.md`, `test-walkthrough.md`

## Dependencies

### Bolt Dependencies (within intent)

- **028-household-data-model** (Required): needs `household_members` / `profiles` + their RLS and
  the `household_id` columns to exist for the context query and the types regen

### Unit Dependencies (cross-unit)

- **001-household-data-model** (Required): the whole schema foundation; in practice bolts
  `026`–`028` are enough, `030` is not blocking

### Enables

- `005-auth-flows` (future) — registration / invite UI builds on the exposed `useAuth` shape

## Success Criteria

- [ ] `useAuth` consumers can read `householdId` / `role`; populated when a session + membership
      exist, `null` otherwise; query runs once per session resolution
- [ ] Store-config category assignment works against the `(household_id, category)` PK
- [ ] `database.types.ts` reflects the new tables + `household_id` columns; `tsc -b` clean
- [ ] Full existing frontend suite passes; store-config test covers the new conflict target
- [ ] `eslint`, `vite build` clean; code reviewed

## Notes

Deliberately one small bolt. `simple-construction-bolt` (3 stages), not DDD — no domain modelling,
just client plumbing. Can be scheduled as soon as bolts `026`–`028` land, ahead of `030`.
