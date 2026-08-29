---
intent: 004-account-model
phase: inception
status: complete
created: '2026-08-28T00:00:00Z'
updated: '2026-08-28T00:00:00Z'
---

# Requirements: account-model

## Intent Overview

Replace the single shared-household login assumption with a real three-tier account model, so
the app can go public-facing. This is the first of three "Tier 2" intents:

- **004-account-model** (this intent) — the data model: `households`, `profiles`,
  `household_members`; a `household_id` on every domain table; a full RLS rewrite enforcing
  household isolation; a reusable `seed_default_household_catalog()` routine; a
  `handle_new_user()` trigger that provisions every new `auth.users` row (fresh seeded
  household, or join-by-invite); and a one-time migration folding all existing data into a
  single founding household. The existing login keeps working as a member of that household.
- **007-auth-flows** (next) — the public registration UI, email confirmation, password reset,
  the invite-sending UI + notification email, role-differentiated permissions, and
  onboarding / empty states.
- **008-account-settings** (last) — the `/settings` page and a household-level
  `dinners_per_week`, threaded through the frontend and the two weekly-plan DB triggers.

### Three-tier model

| Tier         | Table(s)                                                                                    | Purpose                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| User account | `auth.users` (Supabase) + `profiles` (1:1)                                                  | One person, one login. `profiles` holds display name only.                                                             |
| Household    | `households` + `household_members` (`profile_id`, `household_id`, `role` ∈ {owner, member}) | The sharing boundary. **Exactly one household per user** in this intent.                                               |
| Domain data  | every existing table gains `household_id`                                                   | All catalog, tag, store-config, weekly-plan, and history data belongs to a household and is shared by all its members. |

### Ownership map

| Table                       | `household_id`       | Notes                                                                                                              |
| --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `dinners`                   | direct column        | `default current_user_household_id()`                                                                              |
| `dinner_ingredients`        | via `dinner_id`      | scoped through parent in RLS                                                                                       |
| `dinner_steps`              | via `dinner_id`      | scoped through parent in RLS                                                                                       |
| `tags`                      | direct column        | `unique (name)` → `unique (household_id, name)`                                                                    |
| `dinner_tags`               | via `dinner_id`      | scoped through parent in RLS                                                                                       |
| `grocery_store_rows`        | direct column        | `unique (position)` → `unique (household_id, position)`                                                            |
| `category_row_assignments`  | direct column        | PK `(category)` → PK `(household_id, category)`                                                                    |
| `weekly_plans`              | direct column        | **no `user_id`** — one shared plan per week per household; "current plan" = latest unlocked plan for the household |
| `weekly_plan_selections`    | via `weekly_plan_id` | scoped through parent in RLS                                                                                       |
| `meal_history`              | direct column        | denormalized copy from parent plan, like `week_start_date` already is                                              |
| `dinner_last_chosen` (view) | derived              | `security_invoker` view — auto-scopes through RLS on `dinners` / `weekly_plans`                                    |

## Business Goals

| Goal                                                                                                  | Success Metric                                                                                                                                                                               | Priority |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Every domain row belongs to a household and RLS enforces isolation                                    | Zero `using (true)` policies remain; every policy resolves to `household_id = current_user_household_id()` (directly or via parent)                                                          | Must     |
| A user in household A can never read or write household B's data                                      | Per-table cross-household isolation test in `supabase/tests/database/` passes                                                                                                                | Must     |
| Any new `auth.users` row becomes a fully provisioned, catalog-seeded household with zero backend code | Inserting a user (via Supabase dashboard or `signUp`) yields: 1 `profiles` row, 1 `households` row (or invited join), 1 owner `household_members` row, a full default catalog + store config | Must     |
| Existing data survives under one founding household                                                   | After migration, the current login shows the same dinners, tags, plans, store config, and history as before                                                                                  | Must     |
| Model is complete enough that 007-auth-flows adds only UI + email                                     | 007-auth-flows introduces no new ownership columns and no RLS rewrites                                                                                                                       | Must     |
| No regression while shared login is still in use                                                      | Full frontend + DB test suites pass on the new schema                                                                                                                                        | Must     |

---

## Functional Requirements

### FR-1: Household, profile, and membership tables

- **Description**: Add three tables:
  - `profiles` — `id uuid primary key references auth.users(id) on delete cascade`,
    `display_name text`, `created_at timestamptz not null default now()`.
  - `households` — `id uuid primary key default gen_random_uuid()`, `name text not null`,
    `created_at timestamptz not null default now()`.
  - `household_members` — `household_id uuid references households(id) on delete cascade`,
    `profile_id uuid references profiles(id) on delete cascade`,
    `role text not null check (role in ('owner','member'))`,
    `created_at timestamptz not null default now()`,
    `primary key (household_id, profile_id)`, plus `unique (profile_id)` to enforce the
    one-household-per-user rule of this intent.
- **Acceptance Criteria**:
  - All three tables created with RLS enabled.
  - `unique (profile_id)` on `household_members` present (removable in a later intent if
    multi-household is added).
  - Index on `household_members (profile_id)`.
- **Priority**: Must

### FR-2: `current_user_household_id()` helper

- **Description**: A `stable` SQL function returning the caller's household:
  `select household_id from public.household_members where profile_id = auth.uid()`.
  Used as the default for `household_id` columns and as the RLS predicate everywhere.
- **Acceptance Criteria**:
  - Returns the single household id for an authenticated member; `null` for a user with no
    membership.
  - Marked `stable`, `security definer`, `set search_path = ''` (or equivalent hardening).
- **Priority**: Must

### FR-3: `household_id` on every domain table

- **Description**: Add `household_id uuid` per the Ownership Map. Direct columns are
  `not null references households(id) on delete cascade default current_user_household_id()`.
  Update composite constraints: `tags` unique becomes `(household_id, name)`;
  `grocery_store_rows` unique becomes `(household_id, position)`;
  `category_row_assignments` PK becomes `(household_id, category)`.
- **Acceptance Criteria**:
  - Every direct `household_id` column is `not null` with the FK and the default.
  - One index per new `household_id` column.
  - Reworked constraints in place; existing behavior (e.g. contiguous store positions per
    household) preserved.
- **Priority**: Must

### FR-4: RLS rewrite

- **Description**: Replace all 35 `using (true)` / `with check (true)` policies across the 10
  existing domain tables with household-scoped policies, and add policies for the 3 new tables:
  - Direct-column tables: `using (household_id = current_user_household_id())` and matching
    `with check`.
  - Child tables (`dinner_ingredients`, `dinner_steps`, `dinner_tags`,
    `weekly_plan_selections`): `using (exists (select 1 from <parent> p where p.id = <fk> and
p.household_id = current_user_household_id()))`.
  - `profiles`: a user may read/update their own row and read the rows of co-members of their
    household.
  - `households`: members may read their household; **owners** may update it.
  - `household_members`: members may read rows for their own household.
  - `household_invites` (see FR-6): members of the target household may read; owner-only insert
    / update (revoke). No public read.
- **Acceptance Criteria**:
  - `select count(*) from pg_policies where schemaname='public' and qual='true'` → 0 for
    domain tables.
  - Per-table isolation test: a member of household B gets 0 rows / permission error for
    household A's data on select, insert, update, delete.
- **Priority**: Must

### FR-5: `seed_default_household_catalog(p_household_id uuid)` routine

- **Description**: A `security definer` function that populates a given household with the
  default catalog — the dinner/ingredient/step data currently in
  `20260826175606_seed_healthy_family_dinners.sql` and `20260826224346_dinner_catalog_steps.sql`,
  plus the default grocery store rows / category assignments currently in
  `20260828000000_grocery_store_config_defaults.sql`. The data moves into this function so it
  is reusable; the original seed migrations are **not** edited (append-only rule) — instead a
  new migration defines the function and the founding-household migration (FR-8) calls it or
  stamps the already-present rows.
- **Acceptance Criteria**:
  - Calling it on an empty household yields the full default catalog + store config, all rows
    carrying that `household_id`.
  - Idempotency: calling it twice on the same household does not duplicate rows (guard on
    existing data or `on conflict do nothing`).
  - Callable only by the provisioning trigger / migrations, not by `authenticated` directly.
- **Priority**: Must

### FR-6: `household_invites` table + join-by-invite branch

- **Description**: Add `household_invites` — `id uuid pk default gen_random_uuid()`,
  `household_id uuid not null references households(id) on delete cascade`,
  `email text not null`, `invited_by uuid references profiles(id)`,
  `status text not null default 'pending' check (status in ('pending','accepted','revoked'))`,
  `created_at timestamptz not null default now()`,
  `unique (household_id, lower(email)) where status = 'pending'`.
  The invite-**sending** UI and notification email are out of scope (005); this intent
  delivers the table, its RLS, and the trigger logic that consumes it.
- **Acceptance Criteria**:
  - Table created with RLS per FR-4.
  - Inserting a row with a pending invite for `x@example.com`, then creating an `auth.users`
    row for `x@example.com`, results in that user joining the invited household as `member`
    (no new household, no catalog seed) and the invite row moving to `accepted`.
- **Priority**: Must

### FR-7: `handle_new_user()` provisioning trigger

- **Description**: An `after insert on auth.users` trigger (`security definer`) that, for the
  new user:
  1. Inserts a `profiles` row (`display_name` = `null` for now; 007-auth-flows collects it).
  2. If a pending `household_invites` row matches `new.email` (case-insensitive): insert
     `household_members (household_id, profile_id, 'member')` and set the invite `accepted`.
  3. Otherwise: insert a `households` row (`name` = a sensible default, e.g. the email
     local-part + "'s household"), insert `household_members (..., 'owner')`, and call
     `seed_default_household_catalog(new_household_id)`.
- **Acceptance Criteria**:
  - Creating a user with no invite → 1 profile, 1 household, 1 owner membership, full seeded
    catalog + store config.
  - Creating a user with a pending invite → 1 profile, 1 member membership, invited household
    unchanged except invite status, no seed run.
  - Trigger failure does not leave a half-provisioned state (runs in the insert transaction).
- **Priority**: Must

### FR-8: Founding-household migration for existing data

- **Description**: A one-time migration that:
  1. Creates one `households` row (the founding household).
  2. Creates a `profiles` row and an `owner` `household_members` row for the existing
     `auth.users` identity designated as `garrett.peter.conn@gmail.com`.
  3. Backfills `household_id` = founding household on every existing domain row (`dinners`,
     `tags`, `grocery_store_rows`, `category_row_assignments`, `weekly_plans`, `meal_history`;
     child tables inherit via parent).
  4. Runs after the `household_id` columns are added but is ordered so the `not null` +
     `default` can be applied cleanly (add nullable → backfill → set not null / set default).
- **Acceptance Criteria**:
  - Post-migration: `select count(*) from <each domain table> where household_id is null` → 0.
  - The existing login sees an unchanged app (same catalog, plans, store config, history).
  - A documented rollback path exists (drop columns / tables in reverse; data retained).
- **Priority**: Must

### FR-9: SQL function / trigger / view scoping updates

- **Description**: Update DB logic affected by the new columns:
  - `fn_weekly_plans_record_meal_history` — also set `meal_history.household_id` from the
    parent plan's `household_id`.
  - `reorder_grocery_store_row(uuid, int)` — scope its `count(*)` and position shuffle to the
    row's `household_id` (derive it once via `FOR UPDATE` select).
  - `dinner_last_chosen` view — confirm it scopes correctly under `security_invoker`; adjust
    the join if needed so it returns only the caller's household's dinners.
  - `lock_weekly_plan`, `fn_weekly_plan_selections_guard`,
    `fn_weekly_plans_require_three_on_lock`, `fn_weekly_plans_block_edit_after_lock` — verify
    they remain correct (all are id-scoped; expected: no functional change, only regression
    coverage).
- **Acceptance Criteria**:
  - `meal_history` rows written on lock carry the right `household_id`.
  - Reordering a store row in household A never renumbers household B's rows.
  - `dinner_last_chosen` returns rows only for the caller's household.
- **Priority**: Must

### FR-10: Frontend ownership context

- **Description**:
  - Extend `useAuth` to load, after the session resolves, the caller's `profile`,
    `household_id`, and `role` (single query), and expose them.
  - Audit the 12 `supabase.from(...)` / `.rpc(...)` sites: reads need no change (RLS scopes
    them); inserts rely on the `household_id` column default, except
    `category_row_assignments` upsert, whose `onConflict` target changes to
    `household_id,category` and which must pass `household_id`.
  - Regenerate `src/shared/lib/database.types.ts`.
- **Acceptance Criteria**:
  - `useAuth` consumers can read `householdId` / `role`; value is present whenever a session
    is present and the user has a membership.
  - All existing frontend tests pass; the store-config upsert test covers the new conflict
    target.
- **Priority**: Must

### FR-11: Update project standards docs

- **Description**: Update `memory-bank/standards/system-architecture.md` (the RLS /
  "all sessions share one access level" section) and `memory-bank/standards/tech-stack.md`
  (the "single shared login, no per-user accounts, no public signup" section) to describe the
  three-tier model and household-scoped RLS. Fix the stale `auth/ # shared household login`
  comment in `coding-standards.md`.
- **Acceptance Criteria**:
  - Neither doc still asserts a single shared access level or "no public signup".
  - `decision-index.md` gets an entry for the model change.
- **Priority**: Must

---

## Non-Functional Requirements

### Security

| Requirement               | Standard                                                           | Notes                                                                            |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Authorization             | RLS gated on household membership                                  | Supabase-only; RLS is the sole enforcement point                                 |
| Cross-household isolation | No row of another household is readable or writable                | Verified per table in `supabase/tests/database/`                                 |
| Function hardening        | `security definer` functions pin `search_path`                     | `current_user_household_id`, `seed_default_household_catalog`, `handle_new_user` |
| Privilege                 | `seed_default_household_catalog` not executable by `authenticated` | Only trigger / migration paths                                                   |

### Reliability

| Requirement            | Metric                                                  | Target                                                     |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Migration data loss    | Rows lost or unassigned                                 | Zero; every domain row ends with a non-null `household_id` |
| Provisioning atomicity | Half-provisioned users after a failed `handle_new_user` | Zero — runs in the `auth.users` insert transaction         |
| Regression             | Existing frontend + DB test suites                      | 100% pass on the new schema                                |

### Performance

| Requirement      | Metric                             | Target                                                                             |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| Household lookup | `current_user_household_id()` cost | Single indexed 1-row lookup; function `stable` so it is not re-evaluated per row   |
| Scoped queries   | Added latency vs today             | Negligible — one indexed equality predicate; `household_id` indexed on every table |

### Compatibility

| Requirement                   | Notes                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared login keeps working    | The existing password login operates as an owner member of the founding household for the entire life of this intent; sign-up UI is 007-auth-flows |
| No user-facing feature change | 004 ships no new screens; catalog, plan, shopping list, cooking, store config behave exactly as before                                             |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded by the Construction Agent from `memory-bank/standards/`.

**Intent-specific constraints**:

- Supabase-only backend — all authorization is RLS; provisioning must be a DB trigger, not
  server code.
- `supabase/migrations/` is append-only; shipped migration files (including the two seed
  migrations) are not edited. New behavior arrives in new migrations.
- `standards/system-architecture.md` and `standards/tech-stack.md` currently commit to the
  single-shared-login model and MUST be updated within this intent (FR-11).
- The one-household-per-user rule is enforced by `household_members.unique (profile_id)`;
  relaxing it later (multi-household) is explicitly a separate intent.

### Business Constraints

- Existing data must migrate without loss into a founding household owned by
  `garrett.peter.conn@gmail.com`.
- The app is becoming public-facing: anyone may register with email + password and gets their
  own seeded household.

---

## Assumptions

| Assumption                                                                                                         | Risk if Invalid                                              | Mitigation                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| The default catalog data can be extracted from the shipped seed migrations into a function without semantic change | Seeded households differ from today's data                   | Diff the function output against the current seeded rows in a DB test                   |
| Exactly one `auth.users` row backs the current shared login                                                        | Migration links the wrong identity / needs to handle N users | Migration parameterizes the founding user; extra users can be added as members manually |
| `security_invoker` on `dinner_last_chosen` makes it auto-scope once underlying tables have household RLS           | "Last made" leaks across households                          | Explicit isolation test on the view                                                     |
| No existing frontend insert depends on setting `household_id` itself (the column default suffices)                 | Inserts fail `not null` or land in the wrong household       | FR-10 audit + tests; `category_row_assignments` already called out as the exception     |

---

## Open Questions

| #    | Question                                                                                                                                          | Owner                      | Resolution                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| OQ-1 | Founding household `name` value (cosmetic)                                                                                                        | User                       | Default to `"Household"` / email local-part unless specified — non-blocking |
| OQ-2 | Is `profiles.display_name` collected at registration (007-auth-flows) or derived from the email local-part until then?                            | Deferred to 007-auth-flows | Non-blocking for 004; column is nullable                                    |
| OQ-3 | DB tests: one shared test-household fixture vs per-file setup                                                                                     | Construction Agent         | Implementation detail                                                       |
| OQ-4 | Should `dinners` / `weekly_plans` / `meal_history` also record _which_ member created/locked (`created_by` profile ref) for later attribution UI? | User                       | Currently OUT of scope — add only if wanted now                             |

---

## Priority Definitions

| Priority | Meaning                                 |
| -------- | --------------------------------------- |
| Must     | Required; intent incomplete without it  |
| Should   | Important but not blocking              |
| Could    | Nice to have                            |
| Won't    | Explicitly out of scope for this intent |

## Out of Scope (Won't — this intent)

- Public registration UI, email confirmation, password reset → **005**
- Invite-sending UI and notification email (the `household_invites` table + consume-on-signup
  logic ARE in scope) → **005**
- Role-differentiated permissions beyond owner-only household update / invite RLS → **005**
- Onboarding and empty states for a brand-new household → **005**
- `/settings` page and `dinners_per_week` → **006**
- Multi-household membership and household switching → future intent
- Private per-user weekly plans → future enhancement (explicitly rejected for now)
