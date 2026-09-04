---
bolt: 050-location-item-model
created: 2026-09-04T17:32:00Z
status: accepted
superseded_by: null
---

# ADR-8: Composite Foreign Keys as the Containment Mechanism for Scoped References

## Context

Intent 010's placement tables each reference several parents at once. An `item_placements` row
names a Household, a Store, an Item, and a Location — and those references have to **agree**:

- the Location must belong to **that Store** (placing an item in another store's aisle is
  meaningless);
- the Store and the Item must belong to **that Household**.

Neither agreement is expressible as an ordinary single-column foreign key. Four separate
single-column FKs each validate their own reference and say nothing about the combination, so
`(store_id = A, location_id = <a location of store B>)` passes every one of them.

The same shape recurs on `category_placements` and `suggestion_dismissals`, and will recur on
every table added when multi-store ships in v2.

Forces at play:

- **No application server** — an invariant not enforced by Postgres is not enforced (ADR-1).
- **RLS is already the tenancy boundary**, gating `household_id = current_user_household_id()`
  on every table. It stops _cross-household_ reads and writes, but it says nothing about
  _cross-store_ references **inside** one household — and a household is exactly where
  multiple Stores will coexist in v2.
- **Every table here denormalizes `household_id`** for RLS simplicity, following this
  codebase's established pattern. Denormalized columns can disagree with their parent.
- The requirements are explicit that cross-store placement must be "enforced in the schema
  (not application code)" — FR-4.

## Decision

Give each parent an additional **composite unique constraint** on `(id, <scope column>)`, and
reference parents through **composite foreign keys** that carry the scope column along.

```sql
stores      … unique (id, household_id)
locations   … unique (id, store_id)
items       … unique (id, household_id)

item_placements
  foreign key (location_id, store_id)  references locations (id, store_id)  on delete cascade
  foreign key (store_id, household_id) references stores    (id, household_id) on delete cascade
  foreign key (item_id,  household_id) references items     (id, household_id) on delete cascade
```

The child's own `store_id` and `household_id` columns are _part of_ the reference, so a row
whose scope columns disagree with its parent's is **not writable at all** — not by the app,
not by a raw SQL client, not by a future migration that forgets the rule.

`unique (id, <scope>)` is redundant with the primary key by definition. That redundancy is the
price of admission: Postgres requires a unique constraint on the exact referenced column pair.

## Rationale

### Why the schema rather than a policy or a check

An RLS policy could test the pairing with a subquery, and application code could check it
before writing. Both are enforcement that has to _run_: a policy only guards the client path,
and application code only guards the code path that remembers to call it. This codebase has
already been bitten by exactly that class of gap — ADR-2 exists because a rule lived in
"whichever RPC the client happens to use" rather than on the event itself.

A composite FK is enforcement that cannot be routed around. It holds for the cutover migration
(bolt 051), for a future import, for a manual fix run in the SQL editor at 2am, and for code
that hasn't been written.

### Why this also settles the denormalized-`household_id` question

Every new table in this codebase faces the same question: carry `household_id` for RLS
simplicity, or reach it through a parent FK? Carrying it is simpler to read and query, but it
creates a column that can drift from the truth.

Composite FKs dissolve the trade-off. `foreign key (store_id, household_id) → stores (id,
household_id)` means the denormalized column is _validated against its source on every write_.
Denormalization a constraint proves correct is free. Denormalization maintained by convention
is a bug waiting for its first careless migration.

### Why the cascade comes along for free

`(location_id, store_id) → locations (id, store_id) on delete cascade` delivers **both**
required behaviours with one constraint: the containment invariant, and story 003's
"deleting a Location deletes the placements that named it." A separate single-column
`location_id → locations(id)` FK would be strictly redundant, so it is deliberately omitted —
worth stating, because its absence looks like an oversight to a reader who doesn't know the
composite FK is already covering it.

### Alternatives Considered

| Alternative                                                       | Pros                                  | Cons                                                                                                                | Why Rejected                                                                            |
| ----------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Single-column FKs only**                                        | Simplest; no extra unique constraints | Validates each reference in isolation; the wrong _combination_ passes every check                                   | Doesn't enforce the invariant at all — the exact bug class FR-4 asks to make impossible |
| **RLS policy with a subquery** (`exists (select 1 …)`)            | Reuses the existing enforcement point | Only guards the client path; migrations and definer functions bypass RLS; a per-row subquery on every write         | Enforcement that a migration or definer function can walk around isn't enforcement      |
| **`CHECK` constraint calling a function**                         | Expressible inline on the table       | Postgres `CHECK` cannot reference other tables (a function-based one is unsound under concurrency and dump/restore) | Not sound — Postgres explicitly does not guarantee cross-table `CHECK` constraints      |
| **Application-side validation**                                   | Easy to write and test in TS          | No server to run it; the cutover migration and SQL-editor writes skip it entirely                                   | Contradicts ADR-1; this codebase has no layer every write passes through                |
| **Drop the denormalized `household_id`**, reach it via `store_id` | No column can drift                   | Every RLS policy becomes a join; diverges from the pattern every existing table follows                             | Costs more than it saves once the composite FK already proves the column correct        |

## Consequences

### Positive

- Cross-store and cross-household placement become **unwritable**, not merely unwritten — by
  any client, any migration, any future code path.
- Denormalized `household_id` is verified on every write rather than trusted.
- One constraint delivers both containment and the required cascade.
- Multi-store (v2) inherits the guarantee with no new work: the invariant is already load-
  bearing while only one Store exists to test it against.
- The pattern is uniform across all three placement-style tables, so a reader learns it once.

### Negative

- Three "redundant" `unique (id, <scope>)` constraints that look pointless to anyone who
  doesn't know they are FK targets — each costs an index.
- Composite FKs need composite indexes on the child side to keep cascades cheap; these must be
  created explicitly, since only the unique constraints index themselves.
- Slightly noisier DDL: three FK clauses on `item_placements` where four single-column ones
  would look more conventional.
- The invariant is invisible in the application layer — a TypeScript reader sees only a
  `23503` foreign-key error and must trace it back to the schema.

### Risks

- **A future table added without the pattern** silently loses the guarantee. _Mitigation_: this
  ADR, plus its "Read when" entry in the decision index; the pattern is uniform across all
  three tables here so the precedent is easy to copy.
- **`unique (id, <scope>)` removed by someone tidying "redundant" constraints** → dependent FKs
  fail to create, or the whole containment guarantee is lost. _Mitigation_: Postgres refuses to
  drop a constraint another FK depends on, so this fails loudly rather than silently.
- **Composite FK error messages are less obvious** than single-column ones when debugging.
  _Mitigation_: pgTAP tests assert the specific rejection (Stage 5), so the intended behaviour
  is documented executably.

## Related

- **Stories**: `001-stores-and-locations-schema` (supplies the `unique (id, store_id)` target),
  `003-item-and-category-placements` (the primary consumer), `005-suggestion-dismissals`
- **Requirements**: FR-4, FR-5 ("enforced in the schema (not application code)")
- **Standards**: candidate for `system-architecture.md` — the rule for new tables is _"scope
  columns travel inside the foreign key, not beside it"_
- **Previous ADRs**: **ADR-1** (no server, so invariants live in Postgres — this is a direct
  application), **ADR-2** (enforcement belongs on the write, not in today's caller),
  **ADR-3** (established denormalizing `household_id` onto every domain table; this ADR makes
  that denormalization self-verifying)
