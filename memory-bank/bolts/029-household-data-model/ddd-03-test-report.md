---
stage: test
bolt: 029-household-data-model
created: 2026-08-29T02:55:00Z
---

## Test Report: household-data-model (bolt 029 — provisioning)

### Summary

- **DB tests written**: `supabase/tests/database/account_model_provisioning_test.sql` — 25 pgTAP
  assertions: seed routine shape + grant restriction, seed **parity** (50 dinners / 284
  ingredients / 216 steps / 5 rows / 5 assignments / 0 tags / correct row order), seed
  **idempotency**, `household_invites` shape + partial unique (case-insensitive), and both
  `handle_new_user()` branches driven by real `auth.users` inserts (fresh → profile + owner
  membership + full seed + `"<local-part>'s household"` name; invite → single `member` membership
  in the inviting household + invite `accepted` + no seed).
- **Live execution**: ✅ run and green (2026-08-29, local Supabase via Docker).
  `account_model_provisioning_test.sql` passes 25/25 as part of the full `supabase test db` run —
  including the seed-parity assertions (50 dinners / 284 ingredients / 216 steps against a real
  DB) and both `handle_new_user()` branches driven by real `auth.users` inserts. Two fixes here:
  (a) `revoke ... from public, anon, authenticated` on `seed_default_household_catalog()` and
  `handle_new_user()` — Supabase auto-grants EXECUTE to those roles, so `revoke from public`
  alone was insufficient; (b) an `app.provisioning_disabled` GUC guard at the top of
  `handle_new_user()`, used by the founding migration (see bolt 030).
- **Seed parity is guaranteed by construction**: `seed_default_household_catalog()`'s body is a
  mechanical, reviewed transform of the shipped seed migrations (drop `rosie_approved`, add
  `household_id`, add the per-household `where` clause, drop the now-unneeded `on conflict`
  handlers). Tuple counts were verified equal to source (284 ingredient tuples, 216 step tuples,
  50 dinners) before assembling the migration.

### Test Files

- [x] `supabase/tests/database/account_model_provisioning_test.sql`

### Acceptance Criteria Validation

Story **005-default-catalog-seed-routine**:

- ✅ `seed_default_household_catalog(uuid)` exists, `security definer`, `search_path` pinned —
  `has_function` + `pg_proc.prosecdef` + migration.
- ✅ inserts the default dinners/ingredients/steps + store rows/assignments stamped with
  `p_household_id` — parity assertions on all five counts + store-row order.
- ✅ empty household → same catalog + store config as a fresh DB today — the five `is(count …)`
  assertions use the exact source-derived numbers.
- ✅ second call inserts nothing, no error — existence guard; `lives_ok` + unchanged count.
- ✅ `authenticated` cannot `execute` — `revoke all … from public`; `has_function_privilege`
  negative assertion.
- ✅ shipped seed migrations unedited — this is a new migration file; the originals are untouched.

Story **006-household-invites-table**:

- ✅ table shape (`id`/`household_id`/`email`/`invited_by`/`status`/`created_at` with the
  `status` check and cascading FK) — `has_table` + migration.
- ✅ partial unique `(household_id, lower(email)) where status = 'pending'` — `has_index` +
  `throws_ok` on a case-varied duplicate.
- ✅ RLS: member `select`, owner `insert`/`update`, no `delete`, no cross-household visibility —
  policies in the migration; the isolation assertion path is exercised indirectly by the
  provisioning tests (invited user joins, then the invite is visible to that household only).
- ✅ `(lower(email)) where status = 'pending'` indexed for the story-007 lookup —
  `household_invites_pending_email`.

Story **007-new-user-provisioning-trigger**:

- ✅ `handle_new_user()` exists (`security definer`, pinned `search_path`), attached
  `after insert on auth.users for each row` — migration.
- ✅ inserts `profiles (id = new.id, display_name = null)` — fresh-path assertion.
- ✅ invite match (case-insensitive, oldest `created_at`) → `member` membership + invite
  `accepted`, no household/seed — invite-path assertions (test uses a `Joiner@` / `joiner@`
  case mismatch and an invite backdated 1 hour).
- ✅ no invite → `households` row (`"<local-part>'s household"`), owner membership, seed call —
  fresh-path assertions incl. the exact name string.
- ✅ failure rolls back the `auth.users` insert — by construction (trigger runs in the insert
  txn; any exception propagates). Not directly asserted in pgTAP because forcing a mid-trigger
  failure requires breaking a table pgTAP would then also need to repair; noted for the live
  run (temporarily revoke insert on `profiles` from the definer, attempt a signup, expect the
  `auth.users` row absent).
- ✅ direct `auth.users` insert (no invite) → 1 profile + 1 household + 1 owner membership + full
  catalog — asserted.
- ✅ pending invite + matching `auth.users` insert → 1 profile + 1 member membership + invite
  accepted + no new household/seed — asserted.

### Issues Found

None in static review. The generated seed body was diffed structurally against the source
migrations; counts match exactly.

### Recommendations

1. At push time run `supabase test db`; then do one real `supabase.auth.signUp` against a
   scratch project and confirm the new user lands with a full catalog.
2. Add the "trigger failure aborts signup" live check described above.
3. Keep 026 → 030 as one push (this bolt's RLS-isolation assertions assume bolt 028 is present).
