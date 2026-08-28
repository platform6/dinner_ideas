---
id: 001-household-profile-membership-schema
unit: 001-household-data-model
intent: 004-account-model
status: planned
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 026-household-data-model
---

# Story: 001-household-profile-membership-schema

## User Story

**As a** platform operator turning Dinner Ideas into a public multi-household app
**I want** identity, household, and membership tables to exist
**So that** every future domain row can be owned by a household and every user resolves to one

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** `public.profiles` exists with
      `id uuid primary key references auth.users(id) on delete cascade`, `display_name text`,
      `created_at timestamptz not null default now()`
- [ ] **Given** the migration, **Then** `public.households` exists with
      `id uuid primary key default gen_random_uuid()`, `name text not null`,
      `created_at timestamptz not null default now()`
- [ ] **Given** the migration, **Then** `public.household_members` exists with
      `household_id uuid not null references households(id) on delete cascade`,
      `profile_id uuid not null references profiles(id) on delete cascade`,
      `role text not null check (role in ('owner','member'))`,
      `created_at timestamptz not null default now()`,
      `primary key (household_id, profile_id)`, and `unique (profile_id)`
- [ ] **Given** `household_members`, **Then** an index on `(profile_id)` exists
- [ ] **Given** all three tables, **Then** RLS is enabled and policies are: a profile may
      `select`/`update` its own row and `select` co-members' profiles; a member may `select` its
      own household; an `owner` may `update` its household; a member may `select`
      `household_members` rows for its own household
- [ ] **Given** a fresh local DB, **When** `supabase db reset` runs, **Then** the migration
      applies with no error and the isolation test for these tables passes

## Technical Notes

- These tables have no `household_id` themselves — their RLS references `auth.uid()` /
  `current_user_household_id()` directly. `current_user_household_id()` is story `002`; sequence
  `002` first or define both in the same bolt (bolt `026` groups them).
- `unique (profile_id)` is what enforces "one household per user" for this intent; a later
  multi-household intent drops it.
- No `insert` policy on `households` / `household_members` for `authenticated` — rows are only
  created by `handle_new_user()` (story `007`) and the founding migration (story `008`), both
  `security definer`.

## Dependencies

### Requires

- None (first story; pairs with `002` in bolt `026`)

### Enables

- `002-current-household-helper`, `003-household-id-on-domain-tables`, `006-household-invites-table`,
  `007-new-user-provisioning-trigger`, `008-founding-household-migration`

## Edge Cases

| Scenario                                        | Expected Behavior                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| A user somehow has two `household_members` rows | Prevented by `unique (profile_id)` — second insert errors                             |
| `auth.users` row deleted                        | `profiles` (and cascade `household_members`) row removed; household + its data remain |
| Profile reads another household's profile       | Denied by RLS (only own + co-members)                                                 |

## Out of Scope

- `household_invites` (story `006`)
- Any `household_id` column on domain tables (story `003`)
- Populating these tables (stories `007`, `008`)
