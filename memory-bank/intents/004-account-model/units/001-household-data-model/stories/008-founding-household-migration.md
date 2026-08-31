---
id: 008-founding-household-migration
unit: 001-household-data-model
intent: 004-account-model
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 030-household-data-model
implemented: true
---

# Story: 008-founding-household-migration

## User Story

**As** the current household using Dinner Ideas today
**I want** all my existing dinners, plans, store config, and history to move into one household under my account
**So that** when I log in after the upgrade nothing is missing

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied on top of the current production schema+data,
      **Then** exactly one `households` row is created (the founding household)
- [ ] **Given** the migration, **Then** a `profiles` row and a `household_members` row with
      `role = 'owner'` are created for the `auth.users` identity whose email is
      `garrett.peter.conn@gmail.com` (looked up in `auth.users`; the migration fails loudly if
      that user does not exist)
- [ ] **Given** the migration, **Then** every existing row in `dinners`, `tags`,
      `grocery_store_rows`, `category_row_assignments`, `weekly_plans`, `meal_history` has its
      `household_id` set to the founding household
- [ ] **Given** the direct-column tables, **When** the backfill completes, **Then** the
      migration runs `alter table ... alter column household_id set not null` on each
- [ ] **Given** the migration, **Then**
      `select count(*) from <table> where household_id is null` is `0` for every domain table
      (child tables inherit via parent; assert their parents are non-null)
- [ ] **Given** a login as the founding user afterwards, **Then** the catalog, current plan,
      locked history, and store layout are byte-for-byte what they were before the migration
- [ ] **Given** the migration file, **Then** it contains a commented rollback plan (drop the
      `not null`, null the column, delete the founding rows) and notes that data is retained

## Technical Notes

- Depends on story `003`'s columns existing **nullable**. Sequence: `003` (nullable columns +
  default) → this story (create founding household, backfill, `set not null`). Bolts `027` then
  `030`.
- Idempotency: guard with `if not exists (select 1 from households)` or a fixed known UUID so a
  re-run is safe in dev.
- This migration does **not** call `seed_default_household_catalog()` — the data is already
  present, it just needs stamping.
- If more than one `auth.users` row exists (e.g. several people used the shared login), only the
  designated founding email becomes owner; others can be added as members later by hand. Recorded
  as an assumption in requirements.

## Dependencies

### Requires

- `003-household-id-on-domain-tables`
- Should land after `004-household-scoped-rls` so a post-migration login is tested under real RLS

### Enables

- Everything downstream — the app is now fully household-scoped with real data

## Edge Cases

| Scenario                                           | Expected Behavior                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `garrett.peter.conn@gmail.com` not in `auth.users` | Migration raises and aborts — do not guess an owner                                                     |
| A domain table is empty                            | Backfill is a no-op; `set not null` still applied                                                       |
| Migration re-run in dev                            | Guarded — no duplicate founding household                                                               |
| New rows inserted between column-add and backfill  | Covered by the `default current_user_household_id()` — but in practice the two migrations ship together |

## Out of Scope

- Seeding a fresh catalog (that's for _new_ households, story `005`)
- Multi-user backfill of `weekly_plans.created_by` (no such column; plans are household-scoped, not user-scoped)
