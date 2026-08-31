---
stage: implement
bolt: 031-account-model-ui
created: 2026-08-29T04:30:00Z
---

## Implementation Walkthrough: account-model-ui

### Summary

`useAuth` now resolves the signed-in user's household context (profile, household id, role) with
one query per session and exposes it on `UseAuthResult`. The two upsert call sites whose
conflict targets changed in the schema work (`category_row_assignments`, `tags`) were pointed at
their new composite targets. `database.types.ts` gained the four new account-model tables, the
`household_id` column on the six direct domain tables, and `current_user_household_id()`. No
component markup or visual change.

### Structure Overview

- The household context lives in a second `useEffect` inside `useAuth`, keyed on the session
  user id, so it runs once per session resolution rather than per render. A `cancelled` flag
  discards a stale response if auth flips twice quickly. When there is no user, the context
  resets to all-`null`.
- The two `onConflict` fixes are string-only. `household_id` is **not** added to either upsert
  payload — bolt 027 gave both columns `default current_user_household_id()`, so an insert that
  omits the column self-assigns to the caller's household. This kept the change to two files and
  avoided threading `householdId` through `DinnerCard` / `StoreConfigPage` and their hooks.
- `database.types.ts` was hand-edited (no Supabase CLI in this environment); a header comment
  says to replace the whole file with a real `supabase gen types typescript --linked` right after
  the migrations are pushed.

### Completed Work

- [x] `src/features/auth/useAuth.ts` — added `profile` / `householdId` / `role` to
      `UseAuthResult` and `AuthProfile` / `HouseholdRole` exports; new effect that queries
      `household_members` (with embedded `profiles`) keyed on the user id; errors logged and context
      cleared on failure; stale "no per-user accounts" comment rewritten.
- [x] `src/features/auth/useAuth.test.ts` — `supabase` mock gains a chainable `from` stub;
      kept the 3 existing cases (load / fail / — plus signIn/out via the hook shape); added 4 cases:
      no session → context null + no query; membership row → fields populated + `from` called once;
      no membership row → fields stay null, no crash; query error → logged + cleared.
- [x] `src/features/store-config/api.ts` — `assignCategory` upsert `onConflict: 'category'` →
      `'household_id,category'` (the PK became composite in bolt 030).
- [x] `src/features/store-config/api.test.ts` — **new**; asserts the composite conflict target,
      that `household_id` is absent from the payload (default self-assigns), and error propagation.
- [x] `src/features/dinners/api.ts` — `addTagToDinner` tag upsert `onConflict: 'name'` →
      `'household_id,name'` (the `tags` unique became `(household_id, name)` in bolt 027).
- [x] `src/shared/lib/database.types.ts` — added `households`, `profiles`, `household_members`,
      `household_invites`; `household_id` on `dinners` / `tags` / `grocery_store_rows` /
      `category_row_assignments` / `weekly_plans` / `meal_history` (Row/Insert/Update +
      Relationships); `household_id` on the `lock_weekly_plan` and `reorder_grocery_store_row`
      function return shapes; `current_user_household_id` in `Functions`; a "regenerate me" header
      comment.
- [x] Test-fixture updates for the now-required `household_id` on `dinners` / `weekly_plans` /
      `grocery_store_rows` rows and the `UseAuthResult` mock shape:
      `AuthGate.test.tsx`, `LoginForm.test.tsx`, `Layout.test.tsx`, `CookingViewPage.test.tsx`,
      `CatalogPage.test.tsx`, `DinnerCard.test.tsx`, `SuppressedPage.test.tsx`, `filters.test.ts`,
      `aggregate.test.ts`, `reorder.test.ts`, `PlanPage.test.tsx`, `toggle-selection.test.ts`,
      `ShoppingListPage.test.tsx`, `StoreConfigPage.test.tsx`.
- [x] Insert / RPC call-site audit (16 rows) — in `implementation-plan.md`; net result: 2
      changed, everything else rides on RLS + the column defaults.

### Key Decisions

- **No `householdId` threading through components.** Story 002's text says thread it from the
  component into the upsert payload; the `default current_user_household_id()` on both columns
  makes that unnecessary. The minimal change (two `onConflict` strings) is lower-risk and keeps
  the bolt genuinely tiny, as the unit brief intends. `useAuth` still exposes `householdId` for
  `007-auth-flows`.
- **`database.types.ts` hand-edited, not generated.** No Supabase CLI / live migrated schema in
  this environment. The shape matches `supabase gen types` output; the header comment mandates a
  real regen post-push.

### Deviations from Plan

- **`tags` upsert also changed** — story 002 said "only `category_row_assignments` is changed",
  but bolt 027 replaced `tags`' `unique (name)` with `unique (household_id, name)`, so
  `addTagToDinner`'s `onConflict: 'name'` would fail at runtime. Fixed the same way (composite
  conflict target, `household_id` via default). Flagged in the construction log.
- Wider test-fixture churn than "a mock or two" — every fixture that builds a `dinners` /
  `weekly_plans` / `grocery_store_rows` row needed `household_id` because those columns are now
  non-optional in the generated `Row` type. Mechanical.

### Dependencies Added

None.

### Developer Notes

- The `useAuth` context query uses `.select('role, household_id, profiles(id, display_name)')` —
  a to-one embed. `data.profiles` is typed loosely (`as { id; display_name } | null`) because the
  hand-written types don't yet model the embed; a real `gen types` + a typed helper can tighten
  this later.
- After the migrations are pushed: regenerate `database.types.ts`, then re-run `tsc -b` — the
  generated file may order keys differently but should be type-compatible.
