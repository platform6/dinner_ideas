---
id: 002-current-household-helper
unit: 001-household-data-model
intent: 004-account-model
status: complete
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 026-household-data-model
implemented: true
---

# Story: 002-current-household-helper

## User Story

**As a** developer writing RLS policies and column defaults
**I want** one function that returns the calling user's household id
**So that** every policy and default is a single, consistent, indexed predicate

## Acceptance Criteria

- [ ] **Given** a new migration, **When** applied, **Then**
      `public.current_user_household_id()` exists, returns `uuid`, and its body is
      `select household_id from public.household_members where profile_id = auth.uid()`
- [ ] **Given** the function, **Then** it is declared `stable`, `security definer`, with
      `set search_path = ''` (or schema-qualified equivalents) and `language sql`
- [ ] **Given** an authenticated member, **When** the function is called, **Then** it returns
      that member's single `household_id`
- [ ] **Given** an authenticated user with no `household_members` row, **When** called, **Then**
      it returns `null` (not an error)
- [ ] **Given** `execute` grants, **Then** `authenticated` may execute it (it is safe — it only
      reveals the caller's own household)
- [ ] **Given** a query plan on a scoped domain table, **When** RLS applies the predicate,
      **Then** the function is evaluated once per statement, not once per row (verified by
      `stable` + an `explain` spot-check in a test)

## Technical Notes

- Used two ways: as the `default` for direct `household_id` columns (story `003`) and as the RLS
  `using` / `with check` predicate everywhere (story `004`).
- `security definer` so it can read `household_members` regardless of that table's own RLS;
  pinning `search_path` is the standard hardening for definer functions.

## Dependencies

### Requires

- `001-household-profile-membership-schema` (needs `household_members`)

### Enables

- `003-household-id-on-domain-tables`, `004-household-scoped-rls`

## Edge Cases

| Scenario                  | Expected Behavior                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Called with no JWT (anon) | `auth.uid()` is null → returns null → RLS denies all rows                                   |
| User in zero households   | Returns null; scoped inserts fail `not null` (intended — a provisioned user always has one) |
| Future multi-household    | This function's signature changes then; out of scope now                                    |

## Out of Scope

- Any multi-household resolution (`current_user_household_ids()` set-returning variant)
- Caching beyond what `stable` gives the planner
