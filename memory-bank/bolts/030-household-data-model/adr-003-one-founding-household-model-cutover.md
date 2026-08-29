---
bolt: 030-household-data-model
created: 2026-08-29T03:18:00Z
status: accepted
superseded_by: null
---

# ADR-3: One-Time Cutover of Existing Data Into a Single Founding Household

## Context

Intent 004 replaces the "single shared household login" model with a three-tier
`auth.users → profiles → households` model and household-scoped RLS on every domain table. The
schema work (bolts 026–029) adds a nullable `household_id` everywhere, rewrites all 35 policies,
and builds `handle_new_user()` provisioning for _new_ accounts.

That leaves the existing production data — ~50 dinners, their ingredients/steps, the current and
locked weekly plans, `meal_history`, the store-row config — with `household_id = null` and no
household to belong to. Something has to connect it to the new model, exactly once, against live
data, with no user-facing change for the person who uses the app today
(`garrett.peter.conn@gmail.com`).

Constraints:

- `supabase/migrations/` is append-only; this is a forward-only migration.
- There is no application server to run a data-migration script — it must be SQL in a migration.
- The app must behave identically for the existing user after the cutover.
- Getting the owner wrong is unrecoverable-ish (it would grant one real person ownership of
  another's data).

## Decision

Add a single forward migration (`20260828234000_account_model_founding_household.sql`) that:

1. **Resolves the founding owner by email** (`garrett.peter.conn@gmail.com`) from `auth.users`.
   If other users exist but not that email, it **raises / aborts** — it never falls back to a
   guessed or first-found user. The one exception is a completely empty `auth.users` (a fresh
   local-dev / CI database that has never run the app's auth): there the migration bootstraps a
   synthetic founding user so `supabase db reset` / `supabase test db` can run. Production always
   has the real user and never takes the bootstrap branch.
2. Creates **one** `households` row with a **fixed, known UUID**, plus the founding `profiles`
   and `owner` `household_members` rows.
3. **Stamps** (`update … where household_id is null`) the founding household id onto every row of
   the six direct-column domain tables. It does **not** call
   `seed_default_household_catalog()` — the data already exists.
4. Runs `alter column household_id set not null` on those six tables and promotes
   `category_row_assignments`'s interim `unique (household_id, category)` to a real primary key.
5. Is **idempotent for dev**: an `if exists (select 1 from households where id = <fixed uuid>)`
   guard makes a re-run a no-op; `on conflict do nothing` covers a partially-applied prior run.

## Rationale

- **Email lookup + hard fail** rather than "first user" or a hard-coded auth UUID: the auth user
  id differs between environments, and silently picking the wrong owner is the worst outcome. A
  loud abort is cheap to recover from (create the user, re-run).
- **Fixed UUID** rather than `gen_random_uuid()`: makes the migration idempotent and makes the
  founding household trivially identifiable in every environment.
- **Stamp, not seed**: re-seeding would duplicate the catalog and, worse, could diverge from the
  data the user has already curated (suppressed dinners, tags, custom store rows).
- **Forward-only**: down-migrating real user data is not something to design for; the header
  documents a manual rollback (drop `not null`, null the column, delete the founding rows —
  **data is retained**) for emergencies only.

### Alternatives Considered

| Alternative                                                           | Why rejected                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hard-code the founding `auth.users` UUID in the migration             | UUID differs per environment; a copy-paste error mislinks data. Email + lookup is self-checking.                                                                                                                                            |
| Abort unconditionally when the email is missing (no bootstrap branch) | Would make `supabase db reset` / `supabase test db` fail on a fresh DB, because the shipped seed migrations create ~50 un-householded dinners the cutover must then stamp. The "empty `auth.users`" bootstrap is unreachable in production. |
| Pick `min(created_at)` / first `auth.users` row as owner              | If the shared login was ever used to create more than one auth user, this silently grants ownership to the wrong person.                                                                                                                    |
| Run the backfill as an out-of-band script (psql / dashboard)          | No server; not reproducible; not captured in `migrations/`; easy to forget in a new environment.                                                                                                                                            |
| Call `seed_default_household_catalog()` for the founding household    | Duplicates existing rows and discards the user's curation (suppressions, tags, custom store layout).                                                                                                                                        |
| Make `household_id` `not null` immediately in bolt 027                | Impossible — there is no household to point ~50 existing rows at until this migration runs. Hence the nullable window.                                                                                                                      |

## Consequences

### Positive

- The existing user logs in after the cutover to a byte-for-byte unchanged app.
- One well-known founding household id simplifies support queries and any future data scripts.
- The migration is safe to run repeatedly in dev/CI.

### Negative

- The whole `026 → 030` migration set must be pushed together — pushing a partial subset leaves
  the app non-functional (nullable `household_id` + household-scoped RLS = nothing visible).
- If more than one person used the shared login, non-founding `auth.users` rows are left without
  a membership and must be attached by hand.

### Risks

- Running against production is a one-shot. Mitigation: the pgTAP suite exercises the backfill
  logic on synthetic "legacy" rows, and the plan is to dry-run against a Supabase branch/copy
  before the real push.

## Related

- **Stories**: `008-founding-household-migration`, `010-update-standards-docs` (unit
  `001-household-data-model`).
- **Standards**: retires the "single shared login / no public signup" language in
  `system-architecture.md` and `tech-stack.md` (story 010, same bolt).
- **Previous ADRs**: `ADR-1` (DB-enforced invariants — the basis for the whole intent),
  `ADR-2` (transition-triggered writes — `meal_history.household_id` is stamped by that trigger
  from bolt 027 on).
