---
id: 029-household-data-model
unit: 001-household-data-model
intent: 004-account-model
type: ddd-construction-bolt
status: complete
started: '2026-08-29T02:00:00Z'
current_stage: null
stages_completed:
  - name: domain-model
    completed: '2026-08-29T02:05:00Z'
    artifact: ddd-01-domain-model.md
  - name: technical-design
    completed: '2026-08-29T02:18:00Z'
    artifact: ddd-02-technical-design.md
  - name: adr-analysis
    completed: '2026-08-29T02:22:00Z'
    artifact: none — standard Supabase handle_new_user pattern; seed re-expression is generated, not a decision
  - name: implement
    completed: '2026-08-29T02:45:00Z'
    artifact: supabase/migrations/20260828233000_account_model_provisioning.sql
  - name: test
    completed: '2026-08-29T02:55:00Z'
    artifact: ddd-03-test-report.md
stories:
  - 005-default-catalog-seed-routine
  - 006-household-invites-table
  - 007-new-user-provisioning-trigger
created: '2026-08-28T00:00:00Z'
requires_bolts:
  - 028-household-data-model
enables_bolts:
  - 030-household-data-model
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
completed: '2026-08-28T23:42:43Z'
---

# Bolt: 029-household-data-model

## Objective

Make registration work end-to-end at the database level: a reusable
`seed_default_household_catalog()` routine, the `household_invites` table + RLS, and the
`handle_new_user()` trigger on `auth.users` that ties them together (fresh seeded household, or
join-by-invite).

## Stories Included

- [ ] **005-default-catalog-seed-routine**: `seed_default_household_catalog(p_household_id)` —
      default dinners/ingredients/steps + store rows/assignments re-expressed from the shipped
      seed migrations, idempotent, not executable by `authenticated` — Priority: Must
- [ ] **006-household-invites-table**: `household_invites` (email, household, status) + partial
      unique on pending + RLS (owner insert/revoke, member read) — Priority: Should
- [ ] **007-new-user-provisioning-trigger**: `handle_new_user()` `after insert on auth.users` —
      profile + (invited `member` join | new `owner` household + seed) — Priority: Must

## Expected Outputs

- New migration(s): the seed function, the invites table + policies, the trigger function +
  trigger
- `supabase/tests/database/`: seed parity vs today's seeded DB, seed idempotency, invite
  isolation, provisioning "fresh household" case, provisioning "invited join" case, atomic
  rollback on seed failure
- DDD artifacts (`ddd-01`/`02`/`03`)

## Dependencies

### Bolt Dependencies (within intent)

- **028-household-data-model** (Required): seeded/invited households must be isolated by RLS for
  the tests to be meaningful; seed writes into now-scoped tables

### Unit Dependencies (cross-unit)

- `001-weekly-dinner-planner` — owns the seed data being re-expressed

### Enables

- `030-household-data-model` — once provisioning works, the founding migration + docs finalize
  the intent

## Success Criteria

- [ ] `seed_default_household_catalog()` on an empty household reproduces today's catalog +
      store config exactly; a second call is a no-op
- [ ] `authenticated` cannot `execute` the seed function
- [ ] Shipped seed migrations are unedited
- [ ] `household_invites` isolation holds (B cannot see/create A's invites)
- [ ] Inserting an `auth.users` row with no invite → 1 profile + 1 household + 1 owner
      membership + full seeded catalog
- [ ] Inserting an `auth.users` row with a matching pending invite → 1 profile + 1 member
      membership, invite `accepted`, no new household/seed
- [ ] A failure inside the trigger rolls back the whole `auth.users` insert
- [ ] DDD stages complete; code reviewed

## Notes

Three stories but tightly cohesive — `007` is the integration point for `005` and `006`. The
`handle_new_user` pattern is standard Supabase; the novel parts are the invite branch and the
seed call. The founding household (bolt `030`) does **not** use the seed function — it stamps
existing rows.
