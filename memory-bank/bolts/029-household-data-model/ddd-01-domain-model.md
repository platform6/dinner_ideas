---
stage: model
bolt: 029-household-data-model
created: 2026-08-29T02:05:00Z
---

## Static Model: household-data-model (bolt 029 — provisioning works end-to-end)

Continues unit `001-household-data-model`. Bolts 026–028 built the schema and its isolation; this
bolt makes **registration produce a usable household at the database level**: a reusable
default-catalog seeding routine, a `household_invites` table, and the `handle_new_user()` trigger
that ties them together. No new domain _tables_ beyond `household_invites`; the interesting model
is the **provisioning process**.

### Bounded Context

The Account context (bolt 026) gains its write side. Reads: `household_invites`. Behaviour:
`handle_new_user()` is a domain service that runs inside the `auth.users` insert transaction.

### Entities

- **HouseholdInvite**: `id` (uuid PK), `household_id` (→ Household, `on delete cascade`), `email`
  (text, stored as entered), `invited_by` (→ Profile, nullable), `status` (`pending | accepted |
revoked`, default `pending`), `created_at`. Business rules: at most one **pending** invite per
  `(household_id, lower(email))` (partial unique index); all email matching is
  case-insensitive (`lower(email)`); an invite is never deleted, only `revoked`; `accepted` is
  set only by `handle_new_user()`.

### Value Objects

- **InviteStatus**: `pending | accepted | revoked` — a small state machine.
  `pending → accepted` (by the provisioning trigger, once), `pending → revoked` (by an owner).
  No other transitions; `accepted` and `revoked` are terminal. Modelled as a `check` constraint
  (project convention), not an enum.
- **DefaultCatalog**: the fixed starter dataset — 50 dinners + 284 ingredient lines + 216 cooking
  steps + 5 store rows + 5 category assignments — re-expressed from the shipped seed migrations.
  It is a _constant of the function_, not data read from any live household, so editing one
  household's catalog never changes what a new household is seeded with.

### Aggregates

- **Household** (root, from bolt 026) now also owns its `HouseholdInvite[]` — invites cascade on
  household delete and are gated by the owner role, same as the household row itself.
- **HouseholdInvite** is a child of `Household`; it has no independent lifecycle.

### Domain Events

- **UserRegistered**: an `auth.users` row is inserted (by GoTrue or the dashboard). The trigger
  source.
- **HouseholdProvisioned** (fresh path): `households` + owner `household_members` + full seeded
  catalog created for the new user.
- **InviteAccepted** (invite path): `household_members (…, 'member')` inserted, the matching
  `household_invites.status` flips to `accepted`; **no** household or catalog created.

### Domain Services

- **DefaultCatalogSeeder** — `seed_default_household_catalog(p_household_id uuid) → void`.
  `security definer`, `search_path` pinned, **not executable by `authenticated`**. Idempotent: a
  no-op if the household already has any dinner. Inserts the DefaultCatalog stamped with
  `p_household_id`. Runs in the caller's transaction — all-or-nothing.
- **NewUserProvisioner** — `handle_new_user() → trigger`, `after insert on auth.users for each
row`, `security definer`, `search_path` pinned. Steps:
  1. insert `profiles (id = new.id, display_name = null)`
  2. look up the **oldest** `pending` `household_invites` row for `lower(new.email)`
  3. **if found**: insert `household_members(…, 'member')` for that household; set the invite
     `accepted`. Stop.
  4. **else**: insert `households (name = <email local-part>'s household)`; insert
     `household_members(…, 'owner')`; call `seed_default_household_catalog(new_household_id)`.
     Any exception propagates and rolls back the entire `auth.users` insert — no half-provisioned
     state is possible.

### Repository Interfaces

- **HouseholdInviteRepository** (client, RLS-gated): `listForOwnHousehold()`,
  `create(email)` (owner only), `revoke(id)` (owner only). Sending the email + the create UI are
  intent `007-auth-flows`.

### Ubiquitous Language

- **Provisioning**: everything `handle_new_user()` does for one new user.
- **Fresh path / invite path**: the two branches — new owner household + seed, vs. join an
  existing household as member.
- **Default catalog**: the fixed starter dataset baked into `seed_default_household_catalog()`.
- **Founding household** (bolt 030): does **not** use this seeder — it stamps the _existing_
  pre-intent rows. The seeder is only for households created after the model ships.

### Relevant Prior Decisions

- `ADR-1`: provisioning has nowhere to live but the database (no server), so it is a trigger.
- `ADR-2`'s reasoning ("put the write on the transition, not in one caller") is echoed:
  `handle_new_user()` is on `auth.users` insert, so a dashboard-created user is provisioned
  identically to a `signUp()` one.

No new ADR: `handle_new_user` is the documented Supabase pattern; the invite branch and the seed
call are the only non-standard parts and are straightforward. The seed re-expression is
mechanically generated from the shipped migrations, not a design choice.
