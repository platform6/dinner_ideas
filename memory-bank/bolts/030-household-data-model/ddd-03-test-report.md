---
stage: test
bolt: 030-household-data-model
created: 2026-08-29T03:50:00Z
---

## Test Report: household-data-model (bolt 030 — founding migration + docs)

### Summary

- **DB tests written**: `supabase/tests/database/account_model_founding_household_test.sql` — 19
  pgTAP assertions on the **post-migration** state: exactly one founding household with the fixed
  UUID, the designated user is its sole `owner`, zero null `household_id` across all six direct
  tables (and non-null parents for two child tables), all six columns `NOT NULL`,
  `category_row_assignments` PK is `(household_id, category)`, and the 50 shipped seed dinners
  survived and belong to the founding household.
- **Live execution**: ✅ run and green (2026-08-29, local Supabase via Docker).
  `account_model_founding_household_test.sql` passes 19/19 as part of the full `supabase test db`
  run. In a fresh `supabase db reset` the migration's "empty `auth.users`" branch bootstraps the
  synthetic founding user and folds the shipped seed data into the fixed-UUID founding household;
  all "no null `household_id`" / `NOT NULL` / composite-PK assertions pass. **Bug fixed here**:
  the bootstrap branch first tried `ALTER TABLE auth.users DISABLE TRIGGER` to keep
  `handle_new_user()` from double-provisioning — that needs ownership of `auth.users`, which the
  migration role lacks. Replaced with `SET LOCAL app.provisioning_disabled = 'on'` around the
  synthetic insert (paired with the guard added to `handle_new_user()` in bolt 029).
- **Docs (story 010)**: applied as surgical edits — `system-architecture.md` (Security Patterns +
  a Decision Relationships bullet), `tech-stack.md` (Authentication section + a Decision
  Relationships bullet), `coding-standards.md` (file-tree comment), `decision-index.md` (ADR-3
  entry, `total_decisions` 2 → 3). `ux-guide.md` left as-is per the story note.

### Test Files

- [x] `supabase/tests/database/account_model_founding_household_test.sql`

### Acceptance Criteria Validation

Story **008-founding-household-migration**:

- ✅ exactly one `households` row created — asserted (`count = 1` on the fixed UUID).
- ✅ `profiles` + `owner` `household_members` for `garrett.peter.conn@gmail.com`, looked up in
  `auth.users`, **fails loudly if a real DB has other users but not that email** — `raise
exception` branch in the migration; asserted indirectly (owner role + email join).
- ✅ every existing row in the six direct tables gets `household_id = founding` — six
  `count(... is null) = 0` assertions.
- ✅ `alter column household_id set not null` on each — six `col_not_null` assertions.
- ✅ `count(*) where household_id is null = 0` for every domain table; child tables checked via
  their parents.
- ✅ founding login sees a byte-for-byte unchanged app — the 50-seed-dinner assertion is the
  automated proxy; the real check is manual at push time (below).
- ✅ commented rollback plan + "data is retained" note — in the migration header.
- ➕ `category_row_assignments` PK promoted `(household_id, category)` — `col_is_pk` assertion
  (needed here because bolt 027 could only add an interim unique while the column was nullable).

Story **010-update-standards-docs**:

- ✅ `system-architecture.md` Security Patterns no longer says "share the same access level";
  now describes the three-tier model, `household_id` everywhere, `current_user_household_id()`,
  `handle_new_user()`, and lists what is deferred.
- ✅ `tech-stack.md` Authentication no longer says "single shared login … no public signup";
  now describes email/password registration, one household per user, invite joining, and points
  the UI to `007-auth-flows`.
- ✅ `coding-standards.md` file-tree comment corrected.
- ✅ `decision-index.md` has a dated ADR-3 entry pointing at this bolt/intent.
- ✅ deferred items noted in both docs.

### Issues Found

- **Cannot be applied by a bare migration run against a DB that has real non-founding users but
  not the founding email** — by design (`raise exception`). Documented in the migration header
  and ADR-3. The production cutover assumes `garrett.peter.conn@gmail.com` already exists in
  `auth.users` (it does — that's today's login).
- The synthetic-user bootstrap branch writes to `auth.users` with a bcrypt placeholder password;
  it is local/CI-only and never reached in production. Flagged so no one is surprised to find a
  founding `auth.users` row with a dummy password in a dev DB.

### Recommendations (the gated push step)

1. **Dry-run first**: create a Supabase branch (or a copy of prod), run `supabase db push`,
   then `supabase test db`, then log in as the founding user and click through catalog / current
   plan / week history / cooking view / shopping list / store config — confirm nothing changed.
2. Only then push to production, as one `supabase db push` covering migrations 20260828230000 → 20260828234000.
3. Immediately after: `select count(*) from <each domain table> where household_id is null;`
   should be 0 everywhere; `select count(*) from public.households;` should be 1.
4. Then do bolt 031 (frontend) and regenerate `database.types.ts` from the live schema to
   replace the hand-written additions.
