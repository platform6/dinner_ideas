---
id: 002-insert-site-audit-and-types-regen
unit: 002-account-model-ui
intent: 004-account-model
status: planned
priority: must
created: '2026-08-28T00:00:00Z'
assigned_bolt: 031-account-model-ui
---

# Story: 002-insert-site-audit-and-types-regen

## User Story

**As a** frontend developer
**I want** every Supabase call site checked against the household-scoped schema and the types regenerated
**So that** reads keep working under RLS and the one changed insert (store-config) is fixed

## Acceptance Criteria

- [ ] **Given** the 12 `supabase.from(...)` / `.rpc(...)` sites across the 8 api/hooks files,
      **When** audited, **Then** each is annotated as "no change (RLS scopes it)" or "changed",
      and only `category_row_assignments` is "changed"
- [ ] **Given** `store-config/api.ts#assignCategory`, **When** updated, **Then** the upsert uses
      `onConflict: 'household_id,category'` and includes `household_id` (from `useAuth`'s
      `householdId`, threaded through the store-config hook) in the payload
- [ ] **Given** `src/shared/lib/database.types.ts`, **When** regenerated with the Supabase CLI
      against the new schema, **Then** it includes `households`, `profiles`,
      `household_members`, `household_invites` and the `household_id` column on every domain
      table, and `tsc -b` is clean
- [ ] **Given** inserts that rely on the `default current_user_household_id()` (`dinners`,
      `tags`, `weekly_plans`, `grocery_store_rows`), **Then** they are left unchanged and a
      test confirms a row created through the hook lands in the caller's household
- [ ] **Given** the existing frontend test suite, **When** run, **Then** it passes; the
      store-config test covers the new conflict target and any mock of the new tables is added
- [ ] **Given** `eslint` and `vite build`, **Then** both are clean

## Technical Notes

- The 8 files: `dinners/api.ts`, `dinners/hooks.ts`, `weekly-plan/api.ts`, `weekly-plan/hooks.ts`,
  `shopping-list/hooks.ts`, `cooking-view/hooks.ts`, `store-config/api.ts`, `store-config/hooks.ts`.
- `assignCategory` currently takes `(category, rowId)`; it needs `householdId`. Thread it from
  `useStoreConfig`/the component via `useAuth().householdId` rather than a second query.
- Regenerate types via `supabase gen types typescript --local` (or `--linked`), per
  `standards/data-stack.md`; commit the result.
- Watch for test mocks that stub `supabase.from('grocery_store_rows')` etc. and now need the
  `household_id` field present.

## Dependencies

### Requires

- `001-useauth-household-context` (source of `householdId`)
- Unit `001-household-data-model` bolts `026`–`028` (schema must exist to gen types against)

### Enables

- Clean baseline for `007-auth-flows`

## Edge Cases

| Scenario                                                     | Expected Behavior                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `householdId` is null when `assignCategory` is called        | Guard: the store-config page is behind `AuthGate`; if null, disable the control / surface the existing error alert |
| A read returns 0 rows because RLS filtered a stale household | Expected post-migration; not a bug                                                                                 |
| Types drift from a later migration                           | Re-run gen; this story just establishes the current baseline                                                       |

## Out of Scope

- Adding `household_id` to insert payloads that already work via the column default
- Any new query or feature
