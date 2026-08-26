---
id: 001-household-login
unit: 003-weekly-dinner-planner-ui
intent: 001-weekly-dinner-planner
status: complete
priority: must
created: '2026-08-26T17:28:00Z'
assigned_bolt: null
implemented: true
---

# Story: 001-household-login

## User Story

**As a** household member
**I want** to log in with a single shared password
**So that** only my family can access our meal plan, without needing separate accounts

## Acceptance Criteria

- [ ] **Given** I open the app while logged out, **When** the app loads, **Then** I see a login screen and no dinner data
- [ ] **Given** I enter the correct shared credentials, **When** I submit, **Then** I'm logged in and see the dinner catalog
- [ ] **Given** I enter incorrect credentials, **When** I submit, **Then** I see a clear error message and remain logged out
- [ ] **Given** I'm logged in, **When** I close and reopen the app, **Then** my session persists (no need to log in every visit)

## Technical Notes

- Supabase Auth, email/password, per `standards/tech-stack.md`.
- Session persistence via Supabase's default client-side session storage.

## Dependencies

### Requires
- None (entry point of the app)

### Enables
- All other UI stories (everything else assumes an authenticated session)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Session expires while using the app | Redirected to login, no crash |
| Offline on app load (PWA) | Cached session (if any) still allows access to previously loaded data |

## Out of Scope

- Per-user accounts/roles — this is intentionally a single shared login (see `standards/tech-stack.md`)
- Password reset flow (small enough household that this can be handled manually via Supabase dashboard if ever needed)
