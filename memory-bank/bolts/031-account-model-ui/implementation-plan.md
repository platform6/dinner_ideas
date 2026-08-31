---
stage: plan
bolt: 031-account-model-ui
created: 2026-08-29T04:06:00Z
---

## Implementation Plan: account-model-ui

### Objective

Wire the frontend to the household-scoped schema from unit `001-household-data-model`: `useAuth`
exposes the caller's `profile` / `householdId` / `role`; the two upsert call sites whose conflict
targets changed are fixed; `database.types.ts` is updated. No new screens, no visual change.

### Deliverables

- `src/features/auth/useAuth.ts` — after the session resolves, one query for the caller's
  `household_members` row (with embedded `profiles`); new `profile` / `householdId` / `role` on
  `UseAuthResult`; refetch on auth change; clear on sign-out. Stale "no per-user accounts" comment
  rewritten.
- `src/features/auth/useAuth.test.ts` — existing 3 cases kept; `supabase` mock gains a `from`
  stub; new cases for the context fields (populated with a membership, `null` without a session,
  no query when logged out).
- `src/features/store-config/api.ts#assignCategory` — `onConflict: 'category'` →
  `onConflict: 'household_id,category'` (the PK became composite in bolt 030).
- `src/features/dinners/api.ts#addTagToDinner` — `onConflict: 'name'` →
  `onConflict: 'household_id,name'` (the `tags` unique became `(household_id, name)` in bolt 027).
  **Not in story 002's text** — see "Deviations" in the walkthrough.
- `src/shared/lib/database.types.ts` — add `profiles`, `households`, `household_members`,
  `household_invites` table types; add `household_id: string` to the `Row`/`Insert`/`Update` of
  the six direct domain tables; add `current_user_household_id` to `Functions`. Hand-written to
  match a `supabase gen types` shape — flagged for replacement by a real gen at push time.
- Insert-site audit table (below), reproduced in the walkthrough.

### Insert / RPC call-site audit (12 sites, 6 files with direct calls)

| #   | Site                                                                                                          | Verb          | Verdict                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `dinners/api.ts:48` `dinners.update({is_active})`                                                             | update        | no change — RLS scopes it; row is the caller's                                                  |
| 2   | `dinners/api.ts:57` `dinners.select('*, dinner_ingredients(*)').in('id', ids)`                                | select        | no change — RLS                                                                                 |
| 3   | `dinners/api.ts:85` `dinner_last_chosen.select('*')`                                                          | select        | no change — `security_invoker` view + RLS                                                       |
| 4   | `dinners/api.ts:125` `tags.select('*')`                                                                       | select        | no change — RLS                                                                                 |
| 5   | `dinners/api.ts:141` `tags.upsert({name}, {onConflict:'name'})`                                               | upsert        | **changed** — `onConflict: 'household_id,name'`; `household_id` self-assigns via column default |
| 6   | `dinners/api.ts:148` `dinner_tags.upsert({...}, {onConflict:'dinner_id,tag_id'})`                             | upsert        | no change — child unique unchanged; RLS via parent dinner                                       |
| 7   | `dinners/api.ts:157` `dinner_tags.delete()`                                                                   | delete        | no change — RLS via parent                                                                      |
| 8   | `dinners/api.ts:167` `dinner_ingredients.select('category')`                                                  | select        | no change — RLS via parent                                                                      |
| 9   | `weekly-plan/api.ts` `weekly_plans.select(... weekly_plan_selections(*, dinners(*)))` (×2: current + by-date) | select        | no change — RLS                                                                                 |
| 10  | `weekly-plan/api.ts` `weekly_plans.insert({start_date})`                                                      | insert        | no change — `household_id` self-assigns via default                                             |
| 11  | `weekly-plan/api.ts` `weekly_plan_selections.insert / .delete`                                                | insert/delete | no change — RLS via parent plan                                                                 |
| 12  | `weekly-plan/api.ts` `rpc('lock_weekly_plan', …)`                                                             | rpc           | no change — id-scoped, RLS on `weekly_plans` update                                             |
| 13  | `store-config/api.ts` `grocery_store_rows` select / insert / delete                                           | mixed         | no change — `household_id` self-assigns on insert; RLS on the rest                              |
| 14  | `store-config/api.ts` `rpc('reorder_grocery_store_row', …)`                                                   | rpc           | no change — RPC scoped to the row's household in bolt 027                                       |
| 15  | `store-config/api.ts` `category_row_assignments.select`                                                       | select        | no change — RLS                                                                                 |
| 16  | `store-config/api.ts` `category_row_assignments.upsert({category,row_id},{onConflict:'category'})`            | upsert        | **changed** — `onConflict: 'household_id,category'`; `household_id` self-assigns via default    |

Net: **2 changed** (both `onConflict` strings), everything else rides on RLS + the
`default current_user_household_id()` column defaults from bolt 027.

### Dependencies

- Unit `001-household-data-model` bolts 026–030 (schema, RLS, `current_user_household_id()`,
  the reworked `tags` / `category_row_assignments` constraints).

### Technical Approach

- **`useAuth`**: a second `useEffect` keyed on `session?.user?.id`. When there's a user id, run
  `supabase.from('household_members').select('role, household_id, profiles(id, display_name)')
.eq('profile_id', userId).maybeSingle()`. `maybeSingle` → `null` when unprovisioned, no throw.
  A `cancelled` flag ignores a stale response when auth flips twice quickly. On no user id, reset
  the context to `{ profile: null, householdId: null, role: null }`. Errors are `console.error`'d
  (same pattern as the existing session-read `catch`) and leave the fields `null`.
- **`onConflict` fixes**: string-only changes. `household_id` is **not** added to either payload —
  bolt 027 gave both columns `default public.current_user_household_id()`, so an insert that omits
  it self-assigns to the caller's household. This is why no `householdId` threading through
  components/hooks is needed (a smaller change than story 002's literal wording; noted as a
  deviation).
- **`database.types.ts`**: hand-edited now because there is no Supabase CLI / live migrated schema
  in this environment. A real `supabase gen types typescript --linked` must replace it right after
  the migrations are pushed; a header comment says so.

### Acceptance Criteria

- [ ] `useAuth` exposes `profile` / `householdId` / `role`; populated with a session + membership,
      `null` otherwise; the query runs once per session resolution (keyed on user id).
- [ ] No session → fields `null`, `supabase.from` not called.
- [ ] `onAuthStateChange` with a new session → context refetched; sign-out → context cleared.
- [ ] Existing `useAuth.test.ts` cases (load, `signIn`, `signOut`) still pass.
- [ ] `assignCategory` upsert uses `onConflict: 'household_id,category'`; `addTagToDinner` uses
      `onConflict: 'household_id,name'`.
- [ ] `database.types.ts` has the 4 new tables + `household_id` on the 6 direct tables;
      `npx tsc -b` clean.
- [ ] `vitest run`, `eslint`, `vite build` clean.
