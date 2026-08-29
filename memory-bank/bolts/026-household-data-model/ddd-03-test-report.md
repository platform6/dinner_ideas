---
stage: test
bolt: 026-household-data-model
created: 2026-08-28T23:56:00Z
---

## Test Report: household-data-model (bolt 026)

### Summary

- **DB tests written**: `supabase/tests/database/account_model_identity_test.sql` — 19 pgTAP
  assertions (schema shape, one-household-per-user uniqueness, `current_user_household_id()`
  resolution for member / unmembered / anon, function volatility + `security definer`, and
  two-household RLS isolation).
- **Live execution**: ✅ **run and green (2026-08-29, local Supabase via Docker)** — `supabase db
reset` applies this migration cleanly; `account_model_identity_test.sql` passes 19/19 as part
  of the full `supabase test db` run (165 assertions, 12 files, all green). One fix landed during
  verification: `revoke ... from anon, authenticated` (not just `public`) was needed because
  Supabase auto-grants EXECUTE on new `public` functions — but that applied to bolt 029's
  functions, not `current_user_household_id()` (which intentionally keeps its grant).
  `supabase db push` to the linked cloud project is still gated.
- **Static review**: migration SQL reviewed by hand against the story acceptance criteria and the
  existing migration conventions (additive, `if not exists`, schema-qualified definer body,
  `revoke all` + explicit grant). No syntax issues found.

### Test Files

- [x] `supabase/tests/database/account_model_identity_test.sql` — identity foundation: tables,
      keys, the resolver function, and RLS isolation between two households.

### Acceptance Criteria Validation

Story **001-household-profile-membership-schema**:

- ✅ `profiles` shape (`id` PK → `auth.users` `on delete cascade`, `display_name`, `created_at`) —
  covered by `has_table` + `col_is_pk` + migration.
- ✅ `households` shape (`id` default `gen_random_uuid()`, `name not null`, `created_at`).
- ✅ `household_members` shape — PK `(household_id, profile_id)`, `unique (profile_id)`,
  `check (role in ('owner','member'))`, cascading FKs — covered by `col_is_pk`, `col_is_unique`,
  and the unique-violation `throws_ok`.
- ✅ index on `(profile_id)` — `has_index`.
- ✅ RLS enabled + policies: self/co-member `select` on `profiles`, self `update`; member `select`
  on `households`, owner `update`; member `select` on `household_members` — covered by the
  isolation block (member A sees only household A, only its own member/profile rows; owner A can
  rename A but cannot see B).
- ✅ `supabase db reset` applies with no error (verified 2026-08-29).

Story **002-current-household-helper**:

- ✅ function exists, returns `uuid`, body is the `household_members` lookup by `auth.uid()`.
- ✅ declared `stable`, `security definer`, `set search_path = ''`, `language sql` — asserted via
  `pg_proc.provolatile` / `pg_proc.prosecdef` and the migration text.
- ✅ returns the caller's `household_id` for a member; ✅ `null` for an authenticated non-member;
  ✅ `null` for anon — three `is(...)` assertions.
- ✅ `authenticated` may execute it — `grant execute ... to authenticated, anon`.
- ⏳ "evaluated once per statement, not once per row" — the design relies on `stable` + the scalar
  sub-select form; an `explain` spot-check is left as a manual step at push time (noted here
  rather than asserted, since pgTAP `explain` scraping is brittle).

### Issues Found

None in static review. The only open item is live execution, which is blocked on tooling, not on
the code.

### Recommendations

1. At push time: `supabase db push` then `supabase test db` — expect 19/19 green.
2. Manually run `explain (verbose) select * from <a bolt-028 scoped table>` after bolt 028 to
   confirm `current_user_household_id()` shows as a one-time filter, not a per-row `SubPlan`.
3. Bolts 027–030 build directly on this; do not push 026 in isolation to production — push the
   whole `026 → 030` sequence together (bolt 028 briefly leaves existing data invisible to the
   founding login until bolt 030 backfills; see bolt 027/028 designs).
