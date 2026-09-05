---
unit: 001-location-item-model
bolt: 051-location-item-model
stage: design
status: complete
updated: '2026-09-04T19:59:00Z'
---

# Technical Design - Location/Item Model Cutover

## Architecture Pattern

**One forward, additive migration that verifies itself, plus a deferred retirement migration.**

Bolt 050 published the new model. This bolt fills it from the old one. The governing constraint
is the one bolt 050 did not have: **the old model is still load-bearing.** The live store-config
page reads `grocery_store_rows` and `category_row_assignments` today, and its replacement (units
002/003) has not been built. Anything that drops those tables now breaks production between
deploys.

That single fact settles the shape of the bolt:

| Migration                                               | Contents                                                                 | Deployable                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| **A — `…_location_item_model_cutover.sql`** (this bolt) | Seed stores, carry path, carry placements, backfill registry, **verify** | Immediately, safely           |
| **B — `…_retire_grocery_store_rows.sql`** (deferred)    | `drop table grocery_store_rows, category_row_assignments`                | Only after units 002/003 ship |

Migration A is purely additive: it creates rows in bolt 050's tables and touches nothing the
running app reads. Both models coexist and stay readable — which is also what makes the
equivalence claim verifiable.

Story 007's acceptance criterion explicitly allows this: _"dropped (same migration **or a
documented follow-up**)"_. Migration B is that documented follow-up, and documenting it is part
of this bolt's deliverable, not a loose end.

### Where migration B lives — deliberately _not_ in `supabase/migrations/`

Migration B is written in full by this bolt, as
`memory-bank/bolts/051-location-item-model/deferred-retirement-migration.sql`.

It must **not** be placed in `supabase/migrations/` yet: everything in that directory is applied
by `supabase db reset` and by every deploy, so putting it there would drop the tables
immediately — the exact outcome deferring is meant to avoid. Landing it is a deliberate act by
whoever finishes unit 002: move the file into `supabase/migrations/` with a current timestamp.

Its header states the preconditions that must hold first.

**Confirmed with the user (2026-09-04)**: a broken store-config _page_ between deploys would be
acceptable during active development — but dropping the tables breaks the **build**, not just
the page. `src/features/store-config/types.ts` resolves
`Database['public']['Tables']['grocery_store_rows']['Row']`, which stops compiling the moment
the table leaves the regenerated types, so `tsc -b` and therefore `pnpm build` fail and _no_
deploy can go out. Removing that feature code is unit 002's scope, so retirement waits for it.

---

## Layer Structure

```text
┌─────────────────────────────────────────────────────────┐
│  Presentation    store-config page (STILL on the old    │  ← untouched by this bolt
│                  model until units 002/003 ship)        │
├─────────────────────────────────────────────────────────┤
│  Domain          item_location_resolution (bolt 050)    │  ← the verification target
├─────────────────────────────────────────────────────────┤
│  Cutover         seed → carry → backfill → VERIFY       │  ← THIS BOLT (migration A)
├─────────────────────────────────────────────────────────┤
│  Infrastructure  new tables (bolt 050)  ←  old tables   │  ← both alive, deliberately
└─────────────────────────────────────────────────────────┘
```

---

## Open Questions from Stage 1 — Resolved

### OQ-4 (answered first, because it determines the rest): retirement is **deferred**

The old tables stay. Dropping them is migration B, shipped after units 002/003 replace the UI
that reads them. This is not caution for its own sake — the store-config page would 500 on
load, and there is no rollback for a dropped table.

### OQ-1: The equivalence check runs **inside migration A, before it commits**

Not only in tests. The check runs against **real production data** at cutover time, and
`raise exception` aborts the whole migration if it fails — the ADR-3 pattern ("abort loudly
rather than guess"), applied to a different kind of uncertainty.

This is possible precisely because retirement is deferred: both models are alive inside the
transaction, so the baseline exists to compare against. Had the drop been in the same
migration, the check would have had to run before the drop anyway — deferring retirement just
removes the tension entirely.

The pgTAP suite additionally verifies the same property against a _seeded fixture_ (a household
with a known configuration), because the production check can only assert equivalence for
whatever data happens to exist — a household with no assignments would make it vacuously true.

### OQ-2: The aisle pattern is `^\s*aisle\s+\d+`, case-insensitive

```sql
case when l.name ~* '^\s*aisle\s+\d+' then 'aisle' else 'section' end
```

Everything else — including a bare number, a name with "aisle" in the middle, or an empty
name — becomes `section`. Rationale: `section` is the safe default because it is the type that
makes no numeric claim, and `InferredType` is lossy by design. A wrong guess is one tap to fix
in unit 002 and destroys nothing.

The founding household's five rows are the seeded category defaults (`Dairy`, `Grains`,
`Pantry`, `Produce`, `Protein`), so in practice every row infers as `section` — correct, since
none of them is an aisle. Stage 4 confirms this against the live names before relying on it.

### OQ-3: No founding-household special-casing; idempotent instead

ADR-3 needed to _resolve an owner_ by email and abort if absent, because it was inventing a
tenancy relationship that the data could not express. This cutover has no such ambiguity: every
row already carries `household_id`. The transformation is uniform, data-driven, and per
household.

What it does borrow from ADR-3 is **idempotency**: every step is guarded so a re-run is a no-op
(`where not exists`, `on conflict do nothing`), which keeps `supabase db reset` and CI working.

---

## Data Model

No schema changes. This bolt writes rows only. Migration A runs five steps in order, in one
transaction.

### Step 1 — Seed one Store per household

```sql
insert into public.stores (household_id, name, is_active)
select h.id, 'My Store', true
from public.households h
where not exists (
  select 1 from public.stores s where s.household_id = h.id and s.is_active
);
```

Total (every household, including one with no rows — it gets an empty Store and unit 002's
first-run state), exactly one, and idempotent against bolt 050's partial unique index.

### Step 2 — Carry the walking path across

```sql
insert into public.locations (household_id, store_id, name, type, position)
select r.household_id, s.id, r.name,
       case when r.name ~* '^\s*aisle\s+\d+' then 'aisle' else 'section' end,
       r.position
from public.grocery_store_rows r
join public.stores s on s.household_id = r.household_id and s.is_active
where not exists (
  select 1 from public.locations l where l.store_id = s.id and l.position = r.position
);
```

`name` and `position` verbatim; `type` inferred. The old table's `unique (household_id,
position)` guarantees the new `(store_id, position)` uniqueness by construction — no
renumbering, no collision.

### Step 3 — Carry category placements across

**Joined by row identity, never by name** (`CarryAcrossMapping` from the domain model). The
mapping is recovered through `(store_id, position)`, which step 2 preserved exactly:

```sql
insert into public.category_placements (household_id, store_id, category, location_id)
select a.household_id, s.id, a.category, l.id
from public.category_row_assignments a
join public.grocery_store_rows r on r.id = a.row_id
join public.stores s   on s.household_id = a.household_id and s.is_active
join public.locations l on l.store_id = s.id and l.position = r.position
on conflict (store_id, category) do nothing;
```

### Step 3a — ⚠️ The category-domain guard

`category_placements.category` carries `dinner_ingredients.category`'s `CHECK` (5 values;
bolt 050's deviation #2). `category_row_assignments.category` has **no such check** — it is
free text with a `(household_id, category)` primary key.

An assignment naming a category outside that set would make step 3 fail with `23514`
mid-migration. Silently skipping it would be worse: a user's configuration would vanish with no
signal.

So the guard runs **before** step 3 and reports rather than guesses:

```sql
do $$
declare v_bad text;
begin
  select string_agg(distinct a.category, ', ') into v_bad
  from public.category_row_assignments a
  where a.category not in ('Produce','Protein','Dairy','Grains','Pantry');

  if v_bad is not null then
    raise exception
      'Cutover aborted: category_row_assignments contains categories outside the '
      'dinner_ingredients CHECK set: %. Widen the check or clean the data, then re-run.', v_bad;
  end if;
end $$;
```

Expected to be a no-op — the seeded defaults are exactly those five — but it converts an
obscure mid-migration constraint violation into a message that says what to do.

### Step 4 — Backfill the Items registry

```sql
insert into public.items (household_id, name)
select distinct on (d.household_id, lower(btrim(di.name)))
       d.household_id, btrim(di.name)
from public.dinner_ingredients di
join public.dinners d on d.id = di.dinner_id
where btrim(di.name) <> ''
on conflict (household_id, name_key) do nothing;
```

Uses bolt 050's exact `on conflict` target, so the backfill and the trigger cannot disagree
about identity — the property ADR-7 depends on. `distinct on` collapses same-household
case/whitespace variants before they reach the conflict handler.

**No `item_placements` are created.** Not an omission — a rule (see the domain model). Day one
resolves entirely through category inheritance, exactly matching the old model's behaviour.

### Step 5 — Verify equivalence, or abort

Because zero explicit placements exist, resolution reduces to the category level, so
equivalence is provable as a set comparison rather than a per-ingredient walk:

```sql
do $$
declare v_mismatch text;
begin
  with old_order as (
    select a.household_id, a.category, r.position
    from public.category_row_assignments a
    join public.grocery_store_rows r on r.id = a.row_id
  ),
  new_order as (
    select cp.household_id, cp.category, l.position
    from public.category_placements cp
    join public.locations l on l.id = cp.location_id
  )
  select string_agg(format('%s/%s: old=%s new=%s',
                    coalesce(o.household_id, n.household_id),
                    coalesce(o.category, n.category), o.position, n.position), '; ')
    into v_mismatch
  from old_order o
  full outer join new_order n
    on n.household_id = o.household_id and n.category = o.category
  where o.position is distinct from n.position;

  if v_mismatch is not null then
    raise exception 'Cutover aborted — resolved order is not equivalent: %', v_mismatch;
  end if;
end $$;
```

A `FULL OUTER JOIN` is deliberate: an `INNER JOIN` would pass while silently dropping an entire
category. This catches a missing row, an extra row, and a wrong position with one predicate.

---

## API Design

No API surface. Nothing is added to the client's reach: units 002/003 consume bolt 050's view
and RPC, both of which already exist. The only externally visible change is that those tables
now contain data.

---

## Security Design

| Concern                                   | Approach                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who runs the cutover**                  | The migration runs as `postgres`, which owns the tables and bypasses RLS — the only way to write across every household at once.                                                                                              |
| **Household isolation**                   | Preserved by construction: every insert carries `household_id` from its source row, and bolt 050's composite FKs make a mismatched pairing unwritable (ADR-8). The cutover cannot cross households even if a join were wrong. |
| **Registry write path**                   | The backfill writes `items` directly. Legitimate: bolt 050 revoked client writes and left the table owner unrestricted precisely so the trigger and this backfill could work.                                                 |
| **No new grants, policies, or functions** | The bolt adds none. Nothing to review.                                                                                                                                                                                        |

---

## NFR Implementation

| Requirement       | Approach                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No regression** | Enforced in-migration by step 5, against real data, with an abort — not merely asserted in tests.                                                     |
| **Idempotency**   | Every step guarded (`where not exists` / `on conflict do nothing`), so re-runs and `supabase db reset` are no-ops.                                    |
| **Atomicity**     | One transaction. A failure at step 5 rolls back steps 1–4; a failed cutover leaves the database exactly as it was.                                    |
| **Forward-only**  | New file; no prior migration edited. Consistent with every previous cutover in this project.                                                          |
| **Performance**   | Household-scale — the founding household has 5 rows and 284 ingredient lines. Every step is a single set-based statement; no loops, no per-row logic. |
| **Reversibility** | Migration A is reversible by deleting the rows it created (documented in the header). Migration B is **not** reversible, which is why it is deferred. |

---

## Standards Documentation (story 008)

Four documentation edits, made in Stage 4 after the migration is proven:

1 - **`standards/system-architecture.md`** — replace the category→row description with the
Store/Location/Item model; note the registry and its trigger-based sync.
2 - **`standards/data-stack.md`** — same, at the data-layer level.
3 - **`standards/decision-index.md`** — one entry for the intent-level model change, folding in
the Resolved Decisions (dedup key, cascade semantics, reorder reuse, client-side similarity).
ADR-7 and ADR-8 are already indexed from bolt 050 and are referenced, not duplicated.
4 - **`001-weekly-dinner-planner` unit `004-grocery-store-config`'s brief** — a "superseded by
`010`" note.

---

## Story Coverage

| Story                               | Delivered by                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| **007**-cutover-migration           | Migration A steps 1–5, plus migration B documented as the deferred retirement follow-up |
| **008**-standards-and-decision-docs | The four documentation edits above                                                      |

---

## Carried into Stage 4 (Implement)

1 - **Confirm the live `grocery_store_rows` names** infer correctly under the aisle pattern
(expected: all five default rows → `section`).
2 - **Confirm `category_row_assignments.row_id`'s FK and the `(household_id, category)` key
shape** before relying on the step-3 join.
3 - **Verify the store-config page really does still read the old tables** — the premise of
deferring retirement. If units 002/003 have already replaced it, OQ-4 reopens.
4 - **Write migration B** as a documented, uncommitted-to-a-date follow-up, with its
preconditions stated in the file header.
5 - **Re-check the equivalence step against a fixture with a non-trivial ordering** (rows not
in alphabetical order), so the test cannot pass by coincidence.

---

## Carried into Stage 3 (ADR Analysis)

One candidate, weaker than bolt 050's two:

1 - **Deferring destructive retirement behind a separate migration** — the general rule that a
cutover which removes a load-bearing table splits into an additive migration and a deferred
destructive one, gated on the consuming UI shipping. Possibly better placed as a line in
`system-architecture.md` than as a standalone ADR; Stage 3 decides.
