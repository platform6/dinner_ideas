---
bolt: 060-recipe-save
created: 2026-09-08T23:10:00Z
status: accepted
superseded_by: null
---

# ADR-13: Write the Whole Dinner Aggregate in One Database Transaction

## Context

Intent 014 makes the dinner catalog writable. Since intent 001 it has had exactly one writer — a
seed migration — and saving a recipe means writing **four tables**:

- `dinners` — the recipe itself
- `dinner_ingredients` — one row per line
- `dinner_steps` — one row per step
- `dinner_tags` — one link per attached tag (plus find-or-create on `tags`)

Story 005 requires that a save "either works completely or not at all", and forbids a dinner in the
catalog with no ingredients or no steps.

**PostgREST inserts are separate HTTP calls.** There is no transaction available from the browser.
So the requirement cannot be met by writing the obvious code, and the mechanism has to be chosen
deliberately.

### What a Dinner is

The domain model for this bolt asked a narrow question: _what is a Dinner, such that "half of one"
is not a thing that can exist?_

Seven of the aggregate's eight invariants are properties of a **complete** Dinner — at least one
ingredient, at least one step, contiguous step numbers, positive quantities, categories from a
closed set, no tag attached twice, the caller's household on every member.

A `dinners` row with no ingredients does not satisfy the first of those. **It is not a Dinner that
happens to be incomplete. It is not a Dinner.** The aggregate boundary and the transaction boundary
are therefore the same boundary — not as a matter of convenience, but because of what the thing
is.

## Decision

**A `security invoker` Postgres function, `public.fn_create_dinner(...)`, performs every insert in
one transaction.** The client calls it once over PostgREST's RPC endpoint.

The client keeps its validation for the person typing. The function keeps its own for everyone
else — including unit 002's importer, and anything that calls the RPC directly in future.

## Alternatives Considered

### Client-side compensation — rejected

Insert the dinner, then the children, and delete the dinner if anything fails. Both child tables
are `on delete cascade`, so one delete cleans up. It needs no function.

Story 005 rejects this because "the compensating delete can itself fail". That is true, and on its
own it invites the obvious reply — _so retry the delete_ — so the stronger reason is recorded here:

**The window is not only a failure window. It is a visibility window.**

Between the `dinners` insert and the `dinner_ingredients` insert, the dinner row is **committed and
queryable**. This is not hypothetical. The catalog is a live react-query cache on more than one
household member's phone, and `dinner_ingredients` is what the shopping list aggregates. During
that window:

- another member's catalog lists a dinner with no ingredients and no steps
- **it can be picked for the week**, because picking needs only its id
- the shopping list then aggregates nothing for it, silently
- the cooking view shows "No steps available for this dinner yet"

All of that happens on the path where **nothing goes wrong at all**. A completely successful
client-side save still publishes a non-Dinner for as long as the round trips take — which, on a
phone with bad signal in a supermarket, is exactly when this app is being used.

Compensation cannot address this. It is cleanup for the failure case; the visibility problem is in
the _success_ case. Only a transaction keeps the intermediate states unpublished, because only a
transaction makes them invisible rather than merely brief.

The failure argument also holds, and is worse than "the delete might fail": the compensating delete
is most likely to fail **for the same reason the original insert did** — the connection that just
dropped. Compensation is least reliable exactly when it is needed.

### A single `jsonb` blob column — not seriously considered

Storing the recipe as one document would make the write atomic trivially, and is recorded only to
say why it is wrong here: the shopping list aggregates ingredients across dinners, the walking path
resolves individual ingredient names, and intent 010's items trigger fires on `dinner_ingredients`
rows. The relational shape is load-bearing for three other features.

### `security definer` instead of `invoker` — rejected

This project runs **19 `security definer` functions to one `invoker`**, so definer is the local
habit and the reflex would be to follow it. Those 19 are definer for a real reason: they
deliberately bypass RLS (reading `household_members` past that table's own RLS, the key vault, the
AI call counter).

This function needs the opposite. All five tables it writes already carry household-scoped INSERT
policies from intent 004 (`20260828232000_account_model_household_scoped_rls.sql`), and the
recipe tables use Supabase's default table grants — verified, not assumed, because this project has
already met a `42501` from exactly this class of assumption (intent 008's `.upsert` against
`household_ai_config`, which has **column-level grants only** by ADR-4).

With `invoker`, story 005's "the existing RLS insert policies are used unchanged — no new policy,
no `service_role` path" is satisfied **by construction**. With `definer`, RLS would be bypassed and
the function would have to re-derive the household checks the policies already make: more code,
more ways to be wrong, and a new privilege-escalation surface for no gain.

## Consequences

### Good

- **The invariant cannot be violated by any caller**, which is ADR-1's position. The client's
  validation becomes a courtesy for the user rather than the guarantee.
- **Contiguous step numbers become unrepresentable.** Steps arrive as an ordered `text[]` and are
  numbered by `unnest(...) with ordinality`, so there is no parameter in which a gap could be
  expressed. INV-3 is not enforced so much as made inexpressible.
- **One round trip instead of four or more.** The correct option is also the fast one, and fastest
  precisely on the bad connection where compensation degrades.
- **The items trigger (ADR-7) participates in the same transaction.** A rolled-back save leaves no
  registry entry either, with no application code involved — as ADR-7 requires.
- **Tags are resolved inside the save.** A tag created for a dinner that then fails to save would
  be a permanent word added to a shared household vocabulary in exchange for nothing.

### Costs

- **A migration**, and a function to maintain.

  **Correction, found during implementation.** The bolt brief states "the migration is certain"
  because `dinners.name` uniqueness must be rescoped to the household, and story 006's technical
  note says the constraint is "`unique` **globally**, not per household". **Both are stale.**
  Intent 004 already did it on 2026-08-28
  (`20260828231000_account_model_household_id_columns.sql`), and production confirms only
  `dinners_household_id_name_key UNIQUE NULLS NOT DISTINCT (household_id, name)` exists. Resolved
  decision 3 was answered before intent 014 was written.

  So the migration is **not** certain: this decision does add a migration that compensation would
  have avoided. That is recorded plainly because the honest cost matters more than the tidy
  argument — but it changes nothing above. The decision was made on whether the invariant holds,
  which was the brief's actual instruction, and the visibility argument is untouched by what a
  constraint elsewhere already does. Had "avoids a migration" been decisive, this bolt would have
  chosen a mechanism that publishes non-Dinners to other people's phones.

- **Validation exists in two places** — `validateDraft` in TypeScript and the function's own
  checks. This is deliberate duplication with different audiences, not an oversight: one produces
  field-level messages for a person, the other refuses bad data from any caller. They can drift,
  and the pgTAP suite is what catches it.
- **A `jsonb` parameter for ingredients** loses compile-time typing at the boundary. Steps and tags
  are `text[]` and keep theirs; ingredients have four fields and would need a composite type to be
  equally honest, which is a schema object to maintain for one caller.
- **`security invoker` is against the local grain (19:1).** Without this ADR someone will
  eventually "fix" it to `definer` for consistency and silently remove the RLS check on every
  insert. The function's own comment says so at the definition site as well.
- **The function must restate `set search_path = ''`** and schema-qualify everything (**ADR-12**),
  and it must be added to `advisor_hardening_test.sql` — otherwise that suite's guarantee quietly
  covers six functions out of seven.

## Read When

Adding any write that spans more than one table and must be all-or-nothing — the reflex is to write
the inserts in sequence in the client and clean up on failure, and this ADR is why that is wrong
even when the cleanup works. Also read when weighing a compensating action anywhere: ask whether
the intermediate state is merely _brief_ or actually _invisible_, because other clients read
committed rows and a short window is still a published one.

Read before making `fn_create_dinner` `security definer` for consistency with the project's other
functions — it is `invoker` on purpose, and that is what keeps the RLS insert policies in force.

See also **ADR-1** (invariants belong in Postgres), **ADR-7** (the items registry is trigger-owned
and must not be helped), **ADR-11** (rescope a stale invariant — the `dinners.name` change shipping
alongside this), **ADR-12** (restate `set search_path` when writing a function).
