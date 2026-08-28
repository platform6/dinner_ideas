---
id: 007-new-user-provisioning-trigger
unit: 001-household-data-model
intent: 004-account-model
status: planned
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 029-household-data-model
---

# Story: 007-new-user-provisioning-trigger

## User Story

**As a** person registering with email + password
**I want** an account, a household, and a starter catalog created for me automatically
**So that** I can use the app the moment I confirm my email — with no server code involved

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then**
      `public.handle_new_user()` exists (`security definer`, `search_path` pinned) and is
      attached as `after insert on auth.users for each row`
- [ ] **Given** a new `auth.users` row, **Then** the trigger inserts a `profiles` row with
      `id = new.id` and `display_name = null`
- [ ] **Given** the new user's `email` matches a `pending` `household_invites` row
      (case-insensitive; oldest `created_at` wins if several), **Then** the trigger inserts
      `household_members (household_id, profile_id, 'member')` for that household and sets the
      invite `status = 'accepted'` — and does **not** create a household or seed a catalog
- [ ] **Given** no pending invite matches, **Then** the trigger inserts a `households` row
      (`name` = `split_part(new.email,'@',1) || '''s household'`), inserts
      `household_members (household_id, profile_id, 'owner')`, and calls
      `seed_default_household_catalog(new_household_id)`
- [ ] **Given** any failure inside the trigger, **Then** the enclosing `auth.users` insert
      transaction rolls back — no profile without a membership, no household without a seed
- [ ] **Given** a test that inserts directly into `auth.users` (no invite), **Then** exactly
      1 profile, 1 household, 1 owner membership, and the full default catalog + store config
      exist for that user
- [ ] **Given** a test that seeds a pending invite then inserts the matching `auth.users` row,
      **Then** exactly 1 profile, 1 `member` membership for the invited household, the invite is
      `accepted`, and no new household / seed rows were created

## Technical Notes

- Ties stories `005` (seed routine) and `006` (invites table) together — grouped in bolt `029`.
- The `name` default is deliberately simple; `006-auth-flows` can let the owner rename the
  household. Open question OQ-1 in requirements.
- `display_name` stays null until `006-auth-flows` collects it at registration (OQ-2).
- Mirrors the well-known Supabase `handle_new_user` pattern; the only non-standard part is the
  invite branch and the catalog seed call.

## Dependencies

### Requires

- `001-household-profile-membership-schema`, `005-default-catalog-seed-routine`,
  `006-household-invites-table`
- Benefits from `004-household-scoped-rls` being in place so the "seeded household is isolated"
  assertion is meaningful

### Enables

- `002-account-model-ui` (unit 2) — `useAuth` can now assume every session has a membership
- `006-auth-flows` (future) — registration UI just calls `supabase.auth.signUp`

## Edge Cases

| Scenario                                        | Expected Behavior                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Email matches pending invites in two households | Oldest `created_at` invite wins; the other stays `pending`        |
| Invite exists but is `revoked` / `accepted`     | Ignored — user gets a fresh seeded household                      |
| `seed_default_household_catalog` raises         | Whole signup transaction rolls back; user can retry               |
| A user is created via the Supabase dashboard    | Same provisioning runs — the trigger is on the table, not the API |

## Out of Scope

- Email confirmation settings / SMTP config (intent `006-auth-flows`)
- Inviting a user who already has an account (intent `006-auth-flows`)
- Any UI
