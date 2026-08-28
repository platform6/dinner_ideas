---
id: 006-household-invites-table
unit: 001-household-data-model
intent: 004-account-model
status: planned
priority: should
created: '2026-08-28T00:00:00Z'
assigned_bolt: 029-household-data-model
---

# Story: 006-household-invites-table

## User Story

**As a** household owner
**I want** a place to record "this email may join my household"
**So that** when that person registers they land in my household instead of a new empty one

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then** `public.household_invites` exists
      with `id uuid primary key default gen_random_uuid()`,
      `household_id uuid not null references households(id) on delete cascade`,
      `email text not null`, `invited_by uuid references profiles(id)`,
      `status text not null default 'pending' check (status in ('pending','accepted','revoked'))`,
      `created_at timestamptz not null default now()`
- [ ] **Given** the table, **Then** a partial unique index enforces one pending invite per
      email per household: `unique (household_id, lower(email)) where status = 'pending'`
- [ ] **Given** RLS enabled, **Then** members of the target household may `select` its invites;
      an `owner` of the target household may `insert` and `update` (to `revoked`) invites;
      no `authenticated` `delete`; no cross-household visibility
- [ ] **Given** an index, **Then** `(lower(email)) where status = 'pending'` is indexed for the
      trigger's lookup in story `007`
- [ ] **Given** the isolation test, **Then** a member of household B cannot see or create
      invites for household A

## Technical Notes

- This story delivers the **table + RLS only**. The "invited user joins on signup" behaviour is
  the trigger branch in story `007`. The "owner sends an invite" UI + notification email are
  intent `007-auth-flows`.
- `invited_by` is nullable so the founding migration (or a script) can create invites without a
  profile context if ever needed.
- Email is stored as entered; all matching is `lower(...)`.

## Dependencies

### Requires

- `001-household-profile-membership-schema`

### Enables

- `007-new-user-provisioning-trigger`

## Edge Cases

| Scenario                                               | Expected Behavior                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Two owners invite the same email to the same household | Second insert blocked by the partial unique index                      |
| Same email invited to two different households         | Allowed; story `007` picks the oldest pending invite deterministically |
| Invite revoked before the user registers               | `status = 'revoked'` → trigger ignores it, user gets a fresh household |
| User already registered when invited                   | Out of scope here — `007-auth-flows` handles inviting existing users   |

## Out of Scope

- Sending the invite email / any UI (intent `007-auth-flows`)
- Accepting an invite for an already-existing account (intent `007-auth-flows`)
- Expiry / TTL on invites
