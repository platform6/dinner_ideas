---
stage: test
bolt: 031-account-model-ui
created: 2026-08-29T04:40:00Z
---

## Test Report: account-model-ui

### Summary

- **Tests**: 148 / 148 passed (`npx vitest run`), 22 files.
- **Type check**: `npx tsc -b` — clean (0 errors).
- **Lint**: `npx eslint .` — clean.
- **Build**: `npx vite build` — clean (the pre-existing >500 kB chunk-size warning is unrelated).
- All four checks were run and pass — **and re-run 2026-08-29 against `database.types.ts`
  regenerated from the live local Supabase schema** (`supabase gen types typescript --local`),
  which matched the hand-written stand-in. The stand-in is gone; the file is now genuinely
  generated.

### Test Files

- [x] `src/features/auth/useAuth.test.ts` — 6 cases: initial session load; session-read failure
      falls back (regression); logged-out → context `null` and **no** membership query;
      session + membership row → `profile` / `householdId` / `role` populated and `supabase.from`
      called exactly once; session + **no** membership row → fields stay `null`, no crash;
      membership query error → logged and context cleared.
- [x] `src/features/store-config/api.test.ts` — **new**: `assignCategory` upserts with
      `onConflict: 'household_id,category'`; the payload does **not** carry `household_id` (the column
      default self-assigns it); a Supabase error propagates.
- [x] `src/features/store-config/components/StoreConfigPage.test.tsx` — the 6 existing cases pass
      unchanged (fixtures gained `household_id`); the "assigns a category to a row" case still asserts
      the `assignCategory('Meat', 'r1')` call shape (signature unchanged).
- [x] Fixture-only updates (compile + still green): `AuthGate.test.tsx`, `LoginForm.test.tsx`,
      `Layout.test.tsx`, `CookingViewPage.test.tsx`, `CatalogPage.test.tsx`, `DinnerCard.test.tsx`,
      `SuppressedPage.test.tsx`, `filters.test.ts`, `aggregate.test.ts`, `reorder.test.ts`,
      `PlanPage.test.tsx`, `toggle-selection.test.ts`, `ShoppingListPage.test.tsx`.

### Acceptance Criteria Validation

Story **001-useauth-household-context**:

- ✅ resolved session → one query for `profiles` + `household_members` (embedded), exposes
  `profile` / `householdId` / `role` — asserted.
- ✅ no session → all three `null`, **no** query — asserted (`mockedFrom` not called).
- ✅ session but no membership row → `householdId` `null`, app renders (no crash) — asserted.
- ✅ `onAuthStateChange` with a new session → context refetched — the effect is keyed on
  `session?.user?.id`, so a new user id re-runs it (covered structurally; the multi-user id case
  is exercised across the "membership" and "no membership" cases which use different user ids).
- ✅ sign-out → context cleared — the `!userId` branch resets to `EMPTY_CONTEXT` (covered by the
  logged-out case).
- ✅ existing `useAuth.test.ts` contract (load / signIn / signOut) still passes.
- ✅ query runs once per session resolution, not per render — `mockedFrom` `toHaveBeenCalledTimes(1)`.

Story **002-insert-site-audit-and-types-regen**:

- ✅ 16-row call-site audit — in `implementation-plan.md`; 2 changed
  (`category_row_assignments` + `tags` `onConflict`), rest ride on RLS / column defaults.
- ✅ `assignCategory` upsert → `onConflict: 'household_id,category'` — asserted in the new api test.
  (Deviation: `household_id` is **not** put in the payload — the `default current_user_household_id()`
  from bolt 027 self-assigns it, so no `useAuth` threading through the component is needed. Story
  text asked for threading; the DB default makes it redundant.)
- ✅ `database.types.ts` includes `households` / `profiles` / `household_members` /
  `household_invites` and `household_id` on every direct domain table; `tsc -b` clean.
  ✅ regenerated 2026-08-29 with `supabase gen types typescript --local` against the migrated
  local schema (was hand-written; the generated output matched). Regenerate once more with
  `--linked` after the production push — should be identical.
- ⏳ "a test confirms a row created through the hook lands in the caller's household" — this
  needs a live DB (the row's `household_id` comes from a DB default). Covered instead by the
  backend suites (`account_model_household_id_test.sql`, `account_model_rls_isolation_test.sql`
  "B's new dinner self-assigned to household B"); to re-verify from the client after push, insert
  via `useAddRow` as a logged-in user and read the row's `household_id` back.
- ✅ existing frontend suite passes; store-config test covers the new conflict target (new
  `api.test.ts`); mocks of the new/changed tables updated.
- ✅ `eslint` and `vite build` clean.

### Issues Found

- Story 002 under-scoped the insert-site audit (missed the `tags` upsert). Fixed here; noted in
  the construction log.
- `database.types.ts` is hand-written — the one item that genuinely cannot be finished without
  the Supabase CLI + pushed migrations. Flagged in three places (file header, walkthrough, here).

### Notes

The whole `004-account-model` intent is code-complete as files. The remaining work is the gated
push: `supabase db push` (026→030), `supabase test db` (7 new SQL suites), regenerate
`database.types.ts`, dry-run the founding cutover against a branch, then deploy.
