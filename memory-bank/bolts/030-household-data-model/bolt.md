---
id: 030-household-data-model
unit: 001-household-data-model
intent: 004-account-model
type: ddd-construction-bolt
status: planned
stories:
  - 008-founding-household-migration
  - 010-update-standards-docs
created: '2026-08-28T00:00:00Z'
requires_bolts:
  - 029-household-data-model
enables_bolts:
  - 031-account-model-ui
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 030-household-data-model

## Objective

Finalize the intent: the one-time migration that creates the founding household, links
`garrett.peter.conn@gmail.com` as owner, backfills `household_id` across all existing data and
flips the columns to `not null`; plus the standards-doc updates that retire the
single-shared-login model in writing.

## Stories Included

- [ ] **008-founding-household-migration**: create founding `households` row + founding
      `profiles` / owner `household_members`; backfill every domain table; `set not null` on
      direct columns; zero null `household_id`; commented rollback plan — Priority: Must
- [ ] **010-update-standards-docs**: rewrite the RLS section of `system-architecture.md` and the
      auth section of `tech-stack.md`; fix the `coding-standards.md` file-tree comment; add a
      `decision-index.md` entry — Priority: Should

## Expected Outputs

- New migration: founding-household provisioning + backfill + `alter column ... set not null`
- `supabase/tests/database/`: post-migration "no null `household_id`" assertion per table;
  "founding user sees unchanged app" content check; "missing founding user aborts" case
- Edits to `memory-bank/standards/system-architecture.md`, `tech-stack.md`,
  `coding-standards.md`, `decision-index.md`
- DDD artifacts (`ddd-01`/`02`/`03`)

## Dependencies

### Bolt Dependencies (within intent)

- **029-household-data-model** (Required): the schema, RLS, and provisioning must be final before
  real data is migrated onto it
- **027-household-data-model** (Required, transitive): supplies the nullable columns this
  migration backfills

### Unit Dependencies (cross-unit)

- `001-weekly-dinner-planner` — supplies the data being migrated

### Enables

- `031-account-model-ui` — frontend wiring against a fully populated, `not null` schema

## Success Criteria

- [ ] Exactly one founding household; founding user is its `owner`
- [ ] `select count(*) from <table> where household_id is null` → 0 for every domain table
- [ ] Direct `household_id` columns are `not null` after the migration
- [ ] Logging in as the founding user shows the same catalog, plan, history, and store layout as
      before
- [ ] Migration aborts loudly if `garrett.peter.conn@gmail.com` is absent from `auth.users`
- [ ] Neither standards doc still asserts a single shared access level / "no public signup";
      `decision-index.md` has the dated entry
- [ ] DDD stages complete; code reviewed

## Notes

Runs against real production data — the `ddd-02-technical-design.md` should include the exact
backfill statements and the rollback sequence. Idempotency guard (fixed UUID or
`if not exists (select 1 from households)`) keeps dev re-runs safe.
