---
id: 001-useauth-household-context
unit: 002-account-model-ui
intent: 004-account-model
status: planned
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 031-account-model-ui
---

# Story: 001-useauth-household-context

## User Story

**As a** frontend developer (and, soon, the `006-auth-flows` registration screens)
**I want** `useAuth` to expose the signed-in user's profile, household id, and role
**So that** components can show household-aware UI without each one re-querying membership

## Acceptance Criteria

- [ ] **Given** a resolved session, **When** `useAuth` runs, **Then** it issues one query for
      the caller's `profiles` row and `household_members` row (id, household_id, role) and
      exposes `profile`, `householdId`, and `role` on `UseAuthResult`
- [ ] **Given** no session, **Then** `profile` / `householdId` / `role` are `null` and no query
      is made
- [ ] **Given** a session but no membership row (should not happen for provisioned users),
      **Then** `householdId` is `null` and the app still renders (no crash)
- [ ] **Given** `onAuthStateChange` fires with a new session, **Then** the household context is
      refetched for the new user
- [ ] **Given** sign-out, **Then** the household context is cleared
- [ ] **Given** the existing `useAuth.test.ts` contract (initial load, `signIn`, `signOut`),
      **Then** those cases still pass unchanged; new cases cover the context fields
- [ ] **Given** the query, **Then** it runs once per session resolution, not on every render
      (via `useEffect` keyed on the user id, or a TanStack Query with a stable key)

## Technical Notes

- The `stale` comment in `useAuth.ts` ("There are no per-user accounts") is removed/rewritten.
- Prefer a single `select` with an embedded resource:
  `supabase.from('household_members').select('role, household_id, profiles(id, display_name)').single()`
  keyed on the auth uid (RLS already restricts it to the caller's row).
- Keep `UseAuthResult` additive — existing consumers (`AuthGate`, `LoginForm`) compile unchanged.

## Dependencies

### Requires

- Unit `001-household-data-model` bolts `026`–`028` (needs `household_members` / `profiles` and
  their RLS)

### Enables

- `002-insert-site-audit-and-types-regen`
- `006-auth-flows` (future) — registration flow reads `householdId` / `role`

## Edge Cases

| Scenario                      | Expected Behavior                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Context query fails (network) | `householdId` stays `null`, an error is logged (same pattern as the existing session-read catch); app still usable for retry |
| User belongs to no household  | `householdId` null; documented as a non-normal state                                                                         |
| Two rapid auth state changes  | Latest user id wins; stale response ignored                                                                                  |

## Out of Scope

- Any UI that displays the household name/role (that's `006-auth-flows`)
- Household switching (future multi-household intent)
