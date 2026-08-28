---
unit: 001-household-data-model
intent: 004-account-model
phase: inception
status: stories-defined
created: '2026-08-28T00:00:00Z'
updated: '2026-08-28T00:00:00Z'
unit_type: backend
default_bolt_type: ddd-construction-bolt
---

# Unit Brief: Household Data Model

## Purpose

Replace the single-shared-login assumption with a three-tier model (`auth.users` → `profiles` →
`households`) enforced entirely in Postgres: new identity/household tables, a `household_id` on
every domain table, a full RLS rewrite, a reusable default-catalog seeding routine, a
`handle_new_user()` provisioning trigger, and a one-time migration that folds all existing data
into a single founding household. Delivers a complete, testable provisioning mechanism; the
registration/invite UI is intent `007-auth-flows`.

## Scope

### In Scope

- `profiles` (1:1 `auth.users`), `households`, `household_members` (`role`, one-household-per-user
  unique), `household_invites` — tables + RLS (FR-1, FR-6)
- `current_user_household_id()` — `stable`/`security definer` helper, used as column default and
  RLS predicate (FR-2)
- `household_id` on `dinners`, `tags`, `grocery_store_rows`, `category_row_assignments`,
  `weekly_plans`, `meal_history` (direct) and via parent for `dinner_ingredients`,
  `dinner_steps`, `dinner_tags`, `weekly_plan_selections`; reworked constraints
  (`tags` → `(household_id, name)`, `grocery_store_rows` → `(household_id, position)`,
  `category_row_assignments` PK → `(household_id, category)`); one index per column (FR-3)
- Rewrite of all 35 `using (true)` policies to household-scoped; policies for the 4 new tables
  (FR-4)
- `seed_default_household_catalog(p_household_id)` — default dinners/ingredients/steps + default
  store rows/assignments, re-expressed from the two shipped seed migrations, idempotent (FR-5)
- `handle_new_user()` — `after insert on auth.users`: profile + (invited join | new household +
  seed) + membership (FR-7)
- Founding-household migration: one household, a profile + owner membership for
  `garrett.peter.conn@gmail.com`, backfill `household_id` everywhere (FR-8)
- Scoping updates: `fn_weekly_plans_record_meal_history` (set `meal_history.household_id`),
  `reorder_grocery_store_row` (scope `count(*)` + shuffle), `dinner_last_chosen` (per household);
  regression coverage for `lock_weekly_plan` and the three guard triggers (FR-9)
- `standards/system-architecture.md`, `tech-stack.md`, `coding-standards.md`,
  `decision-index.md` updates (FR-11)
- `supabase/tests/database/` — isolation cases per table, seed parity, trigger cases

### Out of Scope

- Public registration UI, email confirmation, password reset → `007-auth-flows`
- Invite-**sending** UI + notification email (the table + consume-on-signup logic ARE here) → `007-auth-flows`
- Role-differentiated permissions beyond owner-only household update / invite RLS → `007-auth-flows`
- New-household onboarding / empty states → `007-auth-flows`
- `/settings` page and `dinners_per_week` → `008-account-settings`
- Multi-household membership / household switching → future
- Private per-user weekly plans → future (rejected for now)
- Frontend changes (`useAuth`, types, insert sites) → unit `002-account-model-ui`

---

## Assigned Requirements

| FR    | Requirement                                       | Priority |
| ----- | ------------------------------------------------- | -------- |
| FR-1  | Household / profile / membership tables           | Must     |
| FR-2  | `current_user_household_id()` helper              | Must     |
| FR-3  | `household_id` on every domain table              | Must     |
| FR-4  | RLS rewrite                                       | Must     |
| FR-5  | `seed_default_household_catalog()` routine        | Must     |
| FR-6  | `household_invites` table + join-by-invite branch | Must     |
| FR-7  | `handle_new_user()` provisioning trigger          | Must     |
| FR-8  | Founding-household data migration                 | Must     |
| FR-9  | SQL function / trigger / view scoping updates     | Must     |
| FR-11 | Update project standards docs                     | Must     |

---

## Domain Concepts

### Key Entities

| Entity           | Description                                              | Notes                                                         |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| Profile          | 1:1 with `auth.users`; holds `display_name`              | `id` = `auth.users.id`                                        |
| Household        | The sharing boundary; owns all domain data               | `name`, `created_at`                                          |
| Household member | Profile ↔ household with a `role` ∈ {owner, member}      | `unique (profile_id)` → one household per user in this intent |
| Household invite | Pending email → household attachment, consumed at signup | `status` ∈ {pending, accepted, revoked}                       |

### Key Operations

| Operation                            | Description                                                  | Inputs                          | Outputs                                                     |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------- |
| `current_user_household_id()`        | Resolve the caller's household for defaults + RLS            | `auth.uid()`                    | `household_id` or null                                      |
| `seed_default_household_catalog(id)` | Populate a household with the default catalog + store config | `household_id`                  | rows inserted (idempotent)                                  |
| `handle_new_user()`                  | Provision a new `auth.users` row                             | `NEW` (id, email)               | profile + membership (+ household + seed, or invite-accept) |
| Founding migration                   | Fold existing global data into one household                 | existing rows, founding user id | every domain row carries `household_id`                     |
| RLS predicate (per table)            | Gate rows on household membership                            | row `household_id` / parent     | visible ⇔ `= current_user_household_id()`                   |

---

## Story Summary

| Metric        | Count |
| ------------- | ----- |
| Total Stories | 10    |
| Must Have     | 8     |
| Should Have   | 2     |
| Could Have    | 0     |

### Stories

| Story ID                                | Title                                                                | Priority | Status  |
| --------------------------------------- | -------------------------------------------------------------------- | -------- | ------- |
| 001-household-profile-membership-schema | Household / profile / membership tables + RLS                        | Must     | Planned |
| 002-current-household-helper            | `current_user_household_id()` helper function                        | Must     | Planned |
| 003-household-id-on-domain-tables       | Add `household_id` + rework constraints on all domain tables         | Must     | Planned |
| 004-household-scoped-rls                | Rewrite all 35 policies to household-scoped                          | Must     | Planned |
| 005-default-catalog-seed-routine        | `seed_default_household_catalog()` routine                           | Must     | Planned |
| 006-household-invites-table             | `household_invites` table + RLS                                      | Should   | Planned |
| 007-new-user-provisioning-trigger       | `handle_new_user()` on `auth.users`                                  | Must     | Planned |
| 008-founding-household-migration        | One-time migration for existing data                                 | Must     | Planned |
| 009-scoping-existing-functions          | Scope meal-history trigger, reorder RPC, last-chosen view            | Must     | Planned |
| 010-update-standards-docs               | Update architecture / tech-stack / coding-standards / decision-index | Should   | Planned |

---

## Dependencies

### Depends On

| Unit                                   | Reason                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `001-weekly-dinner-planner` (complete) | This unit rescopes every table, function, and policy that intent created |

### Depended By

| Unit                                 | Reason                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `002-account-model-ui` (this intent) | Client wiring needs the new columns, helper, RLS, and `household_members` table |
| `007-auth-flows` (future)            | Registration/invite UI consumes this provisioning mechanism                     |
| `008-account-settings` (future)      | `dinners_per_week` hangs off `households`                                       |

### External Dependencies

| System                 | Purpose                                      | Risk                                                                   |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| Supabase Auth (GoTrue) | `after insert on auth.users` trigger surface | Medium — trigger runs in the auth insert txn; a bug blocks all signups |
| Supabase Postgres      | Migrations, RLS, functions                   | Low — standard features                                                |

---

## Technical Context

### Suggested Technology

Plain Postgres migrations in `supabase/migrations/` (append-only), `pgTAP`-style cases in
`supabase/tests/database/`, per `standards/data-stack.md`. No ORM. `security definer` functions
pin `search_path`.

### Integration Points

| Integration                                                     | Type                | Protocol                 |
| --------------------------------------------------------------- | ------------------- | ------------------------ |
| `auth.users`                                                    | Trigger source      | Postgres trigger         |
| Existing RPCs (`lock_weekly_plan`, `reorder_grocery_store_row`) | Modified / verified | SQL                      |
| `dinner_last_chosen` view                                       | Modified            | SQL (`security_invoker`) |

### Data Storage

Owns the 4 new tables and adds a column to the 10 existing domain tables. The founding migration
writes one `households` row, one `profiles` row, one `household_members` row, and backfills
`household_id` across all existing data.

---

## Constraints

- Supabase-only; RLS is the sole enforcement point; provisioning must be a DB trigger.
- `supabase/migrations/` append-only — shipped seed migrations are not edited; their data is
  re-expressed in `seed_default_household_catalog()`.
- One household per user (`household_members.unique (profile_id)`); relaxing it is a later intent.
- Existing data migrates without loss into a founding household owned by
  `garrett.peter.conn@gmail.com`.
- No user-facing feature change; the founding household's app behaves exactly as today.

## Success Criteria

### Functional

- [ ] `households`, `profiles`, `household_members`, `household_invites` exist with RLS enabled
- [ ] `current_user_household_id()` returns the caller's single household id (null if no membership)
- [ ] Every domain table has a non-null `household_id` (direct or enforced via parent) with an index
- [ ] `select count(*) from pg_policies where schemaname='public' and qual='true'` → 0 for domain tables
- [ ] A member of household B gets 0 rows / permission error for household A on select/insert/update/delete (per-table test)
- [ ] `seed_default_household_catalog()` on an empty household reproduces today's seeded catalog + store config exactly; second call is a no-op
- [ ] Inserting an `auth.users` row with no invite yields 1 profile + 1 household + 1 owner membership + full seeded catalog
- [ ] Inserting an `auth.users` row whose email has a pending invite yields 1 profile + 1 member membership, invite → accepted, no new household/seed
- [ ] Post founding-migration: no null `household_id` anywhere; the existing login sees an unchanged app
- [ ] `meal_history` rows written on lock carry the parent plan's `household_id`; reordering store rows in one household never renumbers another's; `dinner_last_chosen` returns only the caller's household's dinners

### Non-Functional

- [ ] `current_user_household_id()` is `stable` and hits a 1-row indexed lookup
- [ ] `handle_new_user()` runs in the `auth.users` insert transaction — a failure leaves no half-provisioned state
- [ ] Existing frontend + `supabase/tests/database/` suites pass on the new schema
- [ ] `security definer` functions pin `search_path`; `seed_default_household_catalog` not executable by `authenticated`

### Quality

- [ ] All acceptance criteria met
- [ ] Migrations apply cleanly from scratch and on top of the current DB
- [ ] Documented rollback path
- [ ] Code reviewed

---

## Bolt Suggestions

| Bolt                     | Type | Stories       | Objective                                                                                                                               |
| ------------------------ | ---- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 026-household-data-model | DDD  | 001, 002      | Identity + household tables, their RLS, and `current_user_household_id()` — the foundation everything else references                   |
| 027-household-data-model | DDD  | 003, 009      | `household_id` on all domain tables + constraint reworks + indexes, and the function/trigger/view scoping that depends on those columns |
| 028-household-data-model | DDD  | 004           | The RLS rewrite — all 35 domain policies → household-scoped, isolated in its own bolt for review and isolation testing                  |
| 029-household-data-model | DDD  | 005, 006, 007 | Seeding routine + invites table + `handle_new_user()` — the "registration works end-to-end" slice                                       |
| 030-household-data-model | DDD  | 008, 010      | Founding-household data migration + standards-doc / decision-index updates                                                              |

Sequence: `026 → 027 → 028 → 029 → 030`.

---

## Notes

The migration ordering inside bolt 027 matters: add `household_id` nullable → backfill within the
same migration is _not_ possible here (no data to backfill until bolt 030's founding row exists),
so columns land nullable with the `current_user_household_id()` default, bolt 030 creates the
founding household and backfills, then a final `alter ... set not null`. Construction should
confirm this staging in `ddd-02-technical-design.md`.
