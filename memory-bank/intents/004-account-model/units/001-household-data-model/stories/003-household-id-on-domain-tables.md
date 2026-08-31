---
id: 003-household-id-on-domain-tables
unit: 001-household-data-model
intent: 004-account-model
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 027-household-data-model
implemented: true
---

# Story: 003-household-id-on-domain-tables

## User Story

**As a** platform operator
**I want** every domain table to carry (directly or via its parent) a `household_id`
**So that** household-scoped RLS has a column to gate on and new rows self-assign to the caller's household

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** these tables gain
      `household_id uuid references households(id) on delete cascade` with
      `default current_user_household_id()`: `dinners`, `tags`, `grocery_store_rows`,
      `category_row_assignments`, `weekly_plans`, `meal_history`
- [ ] **Given** the migration, **Then** each new `household_id` column has a btree index
- [ ] **Given** child tables `dinner_ingredients`, `dinner_steps`, `dinner_tags`,
      `weekly_plan_selections`, **Then** they get **no** column — their household is derived
      through the FK parent (`dinner_id` / `weekly_plan_id`) in RLS
- [ ] **Given** `tags`, **Then** `unique (name)` is replaced by `unique (household_id, name)`
      (keeping `name = lower(name)` check)
- [ ] **Given** `grocery_store_rows`, **Then** `unique (position)` is replaced by
      `unique (household_id, position)`
- [ ] **Given** `category_row_assignments`, **Then** its primary key changes from `(category)`
      to `(household_id, category)`
- [ ] **Given** existing rows at migration time, **When** the column is added, **Then** it is
      added **nullable** (backfill + `set not null` happens in story `008`); the migration
      comment states this staging explicitly
- [ ] **Given** the schema, **When** `supabase gen types` is run later (unit `002`), **Then**
      the new columns appear on the generated types

## Technical Notes

- Ordering: this story's migration adds columns nullable with the default; story `008`'s
  migration creates the founding household, backfills, then `alter column household_id set not
null` on the direct-column tables. Bolt `027` covers this story; bolt `030` covers `008`.
- The `default current_user_household_id()` means most frontend inserts need no change (unit
  `002` confirms); the exception is `category_row_assignments` whose conflict target changes.
- `on delete cascade` on `household_id`: deleting a household removes all its data. Acceptable —
  there is no household-deletion flow in this intent, but the FK should be correct.

## Dependencies

### Requires

- `001-household-profile-membership-schema`, `002-current-household-helper`

### Enables

- `004-household-scoped-rls`, `005-default-catalog-seed-routine`, `008-founding-household-migration`,
  `009-scoping-existing-functions`

## Edge Cases

| Scenario                                                       | Expected Behavior                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Two households define a tag named "quick"                      | Allowed — `unique (household_id, name)`                           |
| Store row positions per household                              | Still contiguous per household; `unique (household_id, position)` |
| A child-table row whose parent is in another household         | Denied at RLS via the parent check (story `004`)                  |
| Insert with an explicit `household_id` that isn't the caller's | Denied by `with check` (story `004`)                              |

## Out of Scope

- The RLS policies themselves (story `004`)
- Backfilling existing rows / `set not null` (story `008`)
- Function/view updates that read these columns (story `009`)
