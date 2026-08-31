---
stage: model
bolt: 026-household-data-model
created: 2026-08-28T23:28:00Z
---

## Static Model: household-data-model (bolt 026 — identity foundation)

**First bolt of unit `001-household-data-model`.** Introduces the identity/household core that
every later bolt (and every rewritten RLS policy) references: `profiles`, `households`,
`household_members`, and the `current_user_household_id()` resolver. No existing table, function,
or policy is touched in this bolt.

### Bounded Context

The **Account** context: who a user is (`profiles`, 1:1 with `auth.users`), what sharing boundary
they belong to (`households`), and the link between them (`household_members`). It sits _beneath_
the existing Dinner-Planner context — that context's tables gain a `household_id` in bolt 027 —
but owns no dinner/plan/store data itself. The ubiquitous term is **household**, not "account" or
"team": the product is a shared family dinner planner.

### Entities

- **Profile**: `id` (= `auth.users.id`, uuid, PK), `display_name` (text, nullable), `created_at`.
  Business rules: exactly one profile per auth user; deleted automatically when the auth user is
  deleted (`on delete cascade`). A profile is readable by itself and by co-members of its
  household, updatable only by itself.
- **Household**: `id` (uuid, PK, `gen_random_uuid()`), `name` (text, not null), `created_at`.
  Business rules: the unit of data ownership and RLS scoping. Rows are created only by
  `security definer` code (`handle_new_user()` in bolt 029, the founding migration in bolt 030) —
  never by an `authenticated` client `insert`. Readable by its members; updatable only by a member
  whose `role` is `owner`.
- **HouseholdMember**: `household_id` (uuid, FK → households, `on delete cascade`), `profile_id`
  (uuid, FK → profiles, `on delete cascade`), `role` (text, `check role in ('owner','member')`),
  `created_at`. PK `(household_id, profile_id)`. Business rules: **one household per user** in this
  intent, enforced by `unique (profile_id)`; a second membership row for the same profile is
  rejected. Created only by `security definer` code. Readable by co-members of the same household.

### Value Objects

- **Role**: the string `'owner' | 'member'`. Modelled as a `check` constraint rather than a
  Postgres `enum` — consistent with this project's existing choice for `dinner_ingredients.category`
  (free text + `check`) so widening the set later never needs a type migration. `owner` differs
  from `member` only in being able to `update` the household row and (bolt 029) manage invites;
  all data access is identical.

### Aggregates

- **Household** (aggregate root): members `Household`, its `HouseholdMember[]`. Invariants: every
  household has at least one `owner` (guaranteed by the provisioning paths in bolts 029/030, not by
  a constraint in this bolt); a profile appears in at most one member row (`unique (profile_id)`).
- **Profile**: its own small aggregate, keyed by the auth user id. Not owned by a household — it
  outlives any single membership and is the stable identity a future multi-household intent would
  attach several memberships to.

### Domain Events

Ubiquitous-language markers only — this project is not event-sourced (same stance as every prior
bolt).

- **HouseholdProvisioned**: a `households` row and its founding `owner` `household_members` row are
  created together. Trigger: `handle_new_user()` (bolt 029) or the founding migration (bolt 030).
- **MembershipGranted**: a `household_members` row is inserted. Payload: `household_id`,
  `profile_id`, `role`.

### Domain Services

- **HouseholdResolver** — `current_user_household_id() → uuid`. The single function that answers
  "which household is the caller in?". Used two ways downstream: as the `default` for direct
  `household_id` columns (bolt 027) and as the RLS `using` / `with check` predicate everywhere
  (bolt 028). Reads `household_members` by `auth.uid()`; returns `null` for an unauthenticated or
  unprovisioned caller (never raises). Must be `stable` so the planner evaluates it once per
  statement, and `security definer` so it can read `household_members` regardless of that table's
  own RLS. `search_path` pinned to `''` (schema-qualified references) as standard definer
  hardening.

### Repository Interfaces

_Conceptual query surface — there is no ORM; these map to Supabase client calls and RLS._

- **ProfileRepository**: `getOwn()`, `getForHousehold(householdId)` (co-members),
  `updateOwn(displayName)`.
- **HouseholdRepository**: `getOwn()` (the caller's single household), `updateOwn(name)` (owner
  only).
- **HouseholdMemberRepository**: `listForOwnHousehold()`.

### Ubiquitous Language

- **Household**: the sharing boundary. All dinner/plan/store data belongs to exactly one household.
- **Profile**: a person's stable identity, 1:1 with a Supabase Auth user.
- **Member / Owner**: a profile's link to a household. `owner` can rename the household and (later)
  manage invites; both roles see and edit the same data.
- **Current household**: the single household the calling user belongs to — the value
  `current_user_household_id()` returns.
- **Founding household**: the one household that existing (pre-intent) data is folded into by
  bolt 030. Not special in the schema — just the first row.

### Relevant Prior Decision

`ADR-1` (Postgres triggers + RPC for domain-invariant enforcement) applies directly: "one
household per user", "households created only by definer code", and the whole RLS scoping model
that follows are invariants with nowhere to live but the database, since there is no application
server. This bolt adds no new architectural decision — it is `ADR-1`'s pattern applied to
identity. The `security definer` + pinned `search_path` shape of `current_user_household_id()` is
standard Supabase hardening, not a project-specific choice, so no new ADR is created.
