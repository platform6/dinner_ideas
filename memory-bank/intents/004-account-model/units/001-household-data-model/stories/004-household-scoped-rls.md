---
id: 004-household-scoped-rls
unit: 001-household-data-model
intent: 004-account-model
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 028-household-data-model
implemented: true
---

# Story: 004-household-scoped-rls

## User Story

**As a** household member
**I want** the database to return and accept only my household's rows
**So that** another household's catalog, plans, and shopping data are never visible or writable to me

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** every existing `using (true)` /
      `with check (true)` policy on `dinners`, `dinner_ingredients`, `dinner_steps`, `tags`,
      `dinner_tags`, `weekly_plans`, `weekly_plan_selections`, `meal_history`,
      `grocery_store_rows`, `category_row_assignments` is dropped and replaced
- [ ] **Given** direct-column tables, **Then** each `select`/`insert`/`update`/`delete` policy
      uses `household_id = current_user_household_id()` (with matching `with check` on
      write policies)
- [ ] **Given** child tables (`dinner_ingredients`, `dinner_steps`, `dinner_tags`,
      `weekly_plan_selections`), **Then** policies use
      `exists (select 1 from <parent> p where p.id = <fk> and p.household_id = current_user_household_id())`
- [ ] **Given** `meal_history`, **Then** it keeps its insert-only shape (no update/delete
      policy) — immutability preserved
- [ ] **Given** `select count(*) from pg_policies where schemaname = 'public' and qual = 'true'`,
      **When** run after the migration, **Then** the result is `0` for all domain tables
- [ ] **Given** two seeded households A and B and a session as a member of B, **When** selecting
      / inserting / updating / deleting against each domain table for A's data, **Then** B sees
      `0` rows or gets a policy violation — one test case per table
- [ ] **Given** a member of B, **When** inserting a row with `household_id` set to A's id,
      **Then** the `with check` rejects it

## Technical Notes

- This is the single riskiest change in the unit — isolated in its own bolt (`028`) so the
  isolation test matrix is the bolt's whole job.
- The child-table `exists(...)` subquery is intentionally against the parent's `household_id`
  column (added in story `003`), not a join back through `households`.
- Grants (`to authenticated`) are unchanged; only the predicates change.
- `dinner_last_chosen` is a `security_invoker` view — it inherits these policies automatically;
  story `009` verifies that.

## Dependencies

### Requires

- `003-household-id-on-domain-tables` (needs the columns + parent columns)

### Enables

- `007-new-user-provisioning-trigger` (seeded households must be isolated), `008-founding-household-migration`

## Edge Cases

| Scenario                                                     | Expected Behavior                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| User with no membership (`current_user_household_id()` null) | All predicates are `household_id = null` → no rows, all writes denied            |
| `security definer` seed/trigger functions                    | Bypass RLS by design; they set `household_id` explicitly                         |
| A child row orphaned mid-transaction                         | `exists(...)` returns false → not visible (acceptable; FKs prevent true orphans) |

## Out of Scope

- Policies for the 4 new tables (`profiles`/`households`/`household_members` in story `001`,
  `household_invites` in story `006`)
- Performance tuning beyond the `household_id` indexes from story `003`
