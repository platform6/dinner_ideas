---
unit: 001-location-item-model
bolt: 050-location-item-model
stage: design
status: complete
updated: '2026-09-04T17:24:49Z'
---

# Technical Design - Location/Item Model

## Architecture Pattern

**Everything in Postgres.** No new application layer, no Edge Function, no service.

This unit is pure data layer, and this codebase has no backend server — so every invariant in
the domain model must be enforced by the database or it is not enforced at all (**ADR-1**).
The design leans on that deliberately:

| Domain rule                                      | Mechanism                                | Not this                    |
| ------------------------------------------------ | ---------------------------------------- | --------------------------- |
| A placement can't name another Store's Location  | Composite foreign key                    | An app-side check           |
| A placement can't name another Household's Item  | Composite foreign key                    | An app-side check           |
| ≤1 active Store per Household                    | Partial unique index                     | An app-side check           |
| One Item per normalized name                     | Generated column + unique constraint     | App-side normalization      |
| An Item exists whenever an ingredient is written | `AFTER` trigger (**ADR-2**)              | A call in the dinner form   |
| Resolution is defined exactly once               | A single view                            | Duplicated TS in units 2, 3 |
| Reorder is race-safe and store-scoped            | `security invoker` RPC with `FOR UPDATE` | Client-side renumbering     |

The published surface is therefore **5 tables + 1 trigger + 1 view + 1 RPC**, consumed
directly by `@supabase/supabase-js` in units 002 and 003.

---

## Layer Structure

```text
┌─────────────────────────────────────────────────────┐
│  Presentation      unit 002 (store config page)     │   ← not this bolt
│                    unit 003 (shopping list sort)    │
├─────────────────────────────────────────────────────┤
│  Application       React Query hooks over           │   ← not this bolt
│                    supabase-js calls                │
├─────────────────────────────────────────────────────┤
│  Domain            item_location_resolution (view)  │   ← THIS BOLT
│                    reorder_location (RPC)           │
│                    fn_dinner_ingredients_sync_item  │
├─────────────────────────────────────────────────────┤
│  Infrastructure    stores, locations, items,        │   ← THIS BOLT
│                    item_placements,                 │
│                    category_placements,             │
│                    suggestion_dismissals            │
│                    + RLS on every one of them       │
└─────────────────────────────────────────────────────┘
```

The domain layer being _inside_ Postgres is the whole point: units 002 and 003 sit above the
same view and cannot drift apart.

---

## Open Questions from Stage 1 — Resolved

### OQ-1: How an Item acquires its category → **modal category, ties broken alphabetically**

An Item has no category column. Resolution's inherited branch needs one, and the upstream rows
can disagree ("Black Beans" filed under `Canned` in one dinner, `Pantry` in another).

`requirements.md` records the assumption as _"most recent / first-seen, applied
consistently"_ — but **neither is implementable as written**: `dinner_ingredients` has no
timestamp column to order by, and UUID primary keys are not chronologically ordered, so
"most recent" and "first-seen" have no definition here.

**Decision**: an Item's category is the one **most of its ingredient rows use**, ties broken
alphabetically.

```sql
row_number() over (partition by item order by count(*) desc, category asc) = 1
```

- **Deterministic** — same inputs, same answer, every time, with no timestamp column.
- **Stable** — adding one dinner rarely flips a category that several dinners agree on,
  whereas "most recent" flips on every edit.
- **Defensible to a user** — "the category you usually file it under."
- **Cheap** — household-scale data (dozens of items).

⚠️ **This deviates from the literal wording of the requirements' assumption** and is flagged
for confirmation at this stage's checkpoint. The deviation is forced, not preferred: the
documented option cannot be built against the actual schema.

An Item with no categorised ingredient row resolves to `unassigned` — indistinguishable, by
design, from an Item whose category simply has no placement.

### OQ-2: View or composed query → **a view**, `item_location_resolution`

Story 004 permits either; the model's requirement is _singularity_. A view enforces
singularity in the one place neither downstream unit can bypass, keeps the resolution rule
next to the tables it reads, and gives both consumers a single typed row shape through
`database.types.ts`.

**Critical detail**: the view is declared `WITH (security_invoker = true)`. Without it a
Postgres view executes as its **owner**, and RLS on the underlying tables is bypassed —
turning the resolution view into a cross-household data leak. This is the single highest-risk
line in the bolt and gets its own pgTAP test in Stage 5.

### OQ-3: Where the Household is denormalized → **on every table, held honest by composite FKs**

Every table carries `household_id NOT NULL`, so every RLS policy is the same one-line
predicate with no joins — matching this codebase's established pattern.

The redundancy is then made **unfalsifiable rather than merely conventional**: each child
table's `household_id` is part of a composite FK into its parent, so a row whose
`household_id` disagrees with its parent's cannot be written at all.

```text
locations              (store_id, household_id) → stores (id, household_id)
item_placements        (store_id, household_id) → stores (id, household_id)
                       (item_id,  household_id) → items  (id, household_id)
                       (location_id, store_id)  → locations (id, store_id)
category_placements    same three shapes, minus the item FK
suggestion_dismissals  (store_id, household_id), (item_id, household_id),
                       (suggested_item_id, household_id)
```

Denormalization that a constraint proves correct costs nothing; denormalization maintained by
convention is a future bug.

---

## Data Model

One migration: `supabase/migrations/20260904180000_location_item_model.sql`.

**Single file, not five.** The tables are mutually referential (composite FKs in both
directions of the graph), so they arrive as one atomic unit or not at all. Append-only; no
prior migration file is touched.

### `stores` (story 001, FR-1)

| Column         | Type                   | Notes                                |
| -------------- | ---------------------- | ------------------------------------ |
| `id`           | `uuid` PK              | `default gen_random_uuid()`          |
| `household_id` | `uuid` NOT NULL        | → `households(id) on delete cascade` |
| `name`         | `text` NOT NULL        |                                      |
| `is_active`    | `boolean` NOT NULL     | `default true`                       |
| `created_at`   | `timestamptz` NOT NULL | `default now()`                      |

- `unique (id, household_id)` — composite FK target for every child table.
- `create unique index … on stores (household_id) where is_active` — **at most one active
  Store per Household**. Partial, so inactive Stores are unconstrained (v2 ready).

### `locations` (story 001, FR-2)

| Column         | Type                   | Notes                                 |
| -------------- | ---------------------- | ------------------------------------- |
| `id`           | `uuid` PK              |                                       |
| `household_id` | `uuid` NOT NULL        |                                       |
| `store_id`     | `uuid` NOT NULL        |                                       |
| `name`         | `text` NOT NULL        | free text; no number required         |
| `type`         | `text` NOT NULL        | `check (type in ('section','aisle'))` |
| `position`     | `integer` NOT NULL     |                                       |
| `created_at`   | `timestamptz` NOT NULL |                                       |

- `foreign key (store_id, household_id) → stores (id, household_id) on delete cascade`
- `unique (id, store_id)` — composite FK target for both placement tables (story 001's
  explicit requirement).
- `unique (store_id, position) deferrable initially deferred` — see **Reorder** below.
- `type` is a `check`, not an enum: adding a third type in v2 is then a one-line migration,
  and it matches how `dinner_ingredients.category` already works (free text, no enum).
- **No index derives ordering from `name`.** `type` drives display only; `position` alone
  orders the path.

### `items` (story 002, FR-3)

| Column         | Type                   | Notes                                             |
| -------------- | ---------------------- | ------------------------------------------------- |
| `id`           | `uuid` PK              |                                                   |
| `household_id` | `uuid` NOT NULL        | → `households(id) on delete cascade`              |
| `name`         | `text` NOT NULL        | stored trimmed; display form                      |
| `name_key`     | `text` GENERATED       | `generated always as (lower(btrim(name))) stored` |
| `created_at`   | `timestamptz` NOT NULL |                                                   |

- `unique (household_id, name_key)` — the registry's identity, and the `on conflict` target.
- `unique (id, household_id)` — composite FK target for placements and dismissals.
- A **generated column, not an expression index**: it is discoverable in `\d items`, usable
  directly as an `on conflict` target, and readable by the view without repeating the
  normalization rule.

### `item_placements` (story 003, FR-4)

| Column                      | Type                   |
| --------------------------- | ---------------------- |
| `id`                        | `uuid` PK              |
| `household_id`              | `uuid` NOT NULL        |
| `store_id`                  | `uuid` NOT NULL        |
| `item_id`                   | `uuid` NOT NULL        |
| `location_id`               | `uuid` **NOT NULL**    |
| `created_at` / `updated_at` | `timestamptz` NOT NULL |

- `unique (item_id, store_id)` — one explicit placement per Item per Store, and the
  `on conflict` target for the place-an-item upsert.
- `foreign key (location_id, store_id) → locations (id, store_id) on delete cascade`

  **One FK does both jobs.** It makes a cross-store placement unwritable _and_ delivers
  story 003's required cascade on Location delete. A separate `location_id → locations(id)`
  FK would be strictly redundant and is deliberately omitted.

- `foreign key (store_id, household_id) → stores (id, household_id) on delete cascade`
- `foreign key (item_id, household_id) → items (id, household_id) on delete cascade`
- `location_id` is `NOT NULL`: "not placed" is the **absence of the row** (Resolved Decision
  3). There is no state in which this row exists without a Location.

### `category_placements` (story 003, FR-5)

Same shape, `category text NOT NULL` in place of `item_id`, `unique (store_id, category)`,
same composite FKs minus the item one. `category` is free text matching
`dinner_ingredients.category` — no enum, no categories table (none exists).

### `suggestion_dismissals` (story 005, FR-8)

| Column              | Type                   |
| ------------------- | ---------------------- |
| `id`                | `uuid` PK              |
| `household_id`      | `uuid` NOT NULL        |
| `store_id`          | `uuid` NOT NULL        |
| `item_id`           | `uuid` NOT NULL        |
| `suggested_item_id` | `uuid` NOT NULL        |
| `created_at`        | `timestamptz` NOT NULL |

- `unique (store_id, item_id, suggested_item_id)` — the `on conflict do nothing` target that
  makes a repeat dismissal a no-op.
- `check (item_id <> suggested_item_id)` — an Item is never its own suggestion.
- Composite FKs to `stores` and (twice) to `items`, all `on delete cascade`: when either Item
  disappears there is no pairing left to suppress.
- Shaped so unit 002's exclusion is a plain anti-join on `(store_id, item_id,
suggested_item_id)` — the story's stated requirement.

### Indexes

Every unique constraint above doubles as its own lookup index. Added explicitly for the FK
columns those don't already cover (Supabase's advisors flag unindexed foreign keys, and these
are the cascade paths):

```text
locations              (store_id, household_id)
item_placements        (location_id, store_id), (store_id, household_id), (item_id, household_id)
category_placements    (location_id, store_id), (store_id, household_id)
suggestion_dismissals  (store_id, household_id), (item_id, household_id),
                       (suggested_item_id, household_id)
```

---

## Trigger: `fn_dinner_ingredients_sync_item` (story 002)

```sql
create function public.fn_dinner_ingredients_sync_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if new.name is null or btrim(new.name) = '' then
    return new;
  end if;

  select d.household_id into v_household_id
  from public.dinners d
  where d.id = new.dinner_id;

  if v_household_id is null then
    return new;                        -- orphan/unscoped row: nothing to register
  end if;

  insert into public.items (household_id, name)
  values (v_household_id, btrim(new.name))
  on conflict (household_id, name_key) do nothing;

  return new;
end;
$$;

create trigger trg_dinner_ingredients_sync_item
after insert or update of name on public.dinner_ingredients
for each row execute function public.fn_dinner_ingredients_sync_item();
```

Design notes:

- **`AFTER`, not `BEFORE`** — the Item is a consequence of a committed ingredient row, never a
  precondition for one. A failure here must never block a dinner from being saved.
- **`security definer` with a pinned `search_path`** — it reads `dinners.household_id` across
  the RLS boundary, matching the existing cross-table trigger functions in this codebase. The
  pinned `search_path` is mandatory for any definer function (search-path injection).
- **`update of name` only** — editing a quantity or category must not re-run the registry sync.
- **`on conflict do nothing` is the whole concurrency story** — two dinners inserting the same
  new ingredient name simultaneously produce exactly one Item, with no advisory lock and no
  retry (story 002's third edge case).
- **`name` is stored trimmed** so the display form matches the key's normalization; case is
  preserved as first written.
- **Nothing prunes.** An ingredient renamed away leaves its old Item in place, possibly
  unreferenced. That is intended — an Item may still carry a placement the user made, and
  pruning is out of scope for this unit.

---

## View: `item_location_resolution` (story 004, FR-6)

**The single definition of resolution.** Both downstream units read this and only this.

```sql
create view public.item_location_resolution
with (security_invoker = true) as
with item_category as (
  select
    i.id            as item_id,
    di.category     as category,
    row_number() over (
      partition by i.id
      order by count(*) desc, di.category asc
    ) as rn
  from public.items i
  join public.dinners d
    on d.household_id = i.household_id
  join public.dinner_ingredients di
    on di.dinner_id = d.id
   and lower(btrim(di.name)) = i.name_key
  where di.category is not null
  group by i.id, di.category
)
select
  i.household_id,
  s.id        as store_id,
  i.id        as item_id,
  i.name      as item_name,
  i.name_key,
  ic.category as item_category,
  coalesce(ip.location_id, cp.location_id) as location_id,
  case
    when ip.location_id is not null then 'placed'
    when cp.location_id is not null then 'inherited'
    else 'unassigned'
  end as state,
  case
    when ip.location_id is null and cp.location_id is not null then cp.category
  end as via_category,
  l.name     as location_name,
  l.type     as location_type,
  l.position as location_position
from public.items i
join public.stores s
  on s.household_id = i.household_id
left join item_category ic
  on ic.item_id = i.id and ic.rn = 1
left join public.item_placements ip
  on ip.item_id = i.id and ip.store_id = s.id
left join public.category_placements cp
  on cp.store_id = s.id and cp.category = ic.category
left join public.locations l
  on l.id = coalesce(ip.location_id, cp.location_id);
```

`grant select on public.item_location_resolution to authenticated;`

| Property from the domain model | How the SQL guarantees it                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Total**                      | The base is `items ⋈ stores`; every placement join is a `LEFT JOIN`, so every Item yields exactly one row per Store, always. |
| **Ordered**                    | The `CASE` tests `ip` before `cp`; `coalesce(ip, cp)` picks in the same order. Explicit cannot lose to inherited.            |
| **Singular**                   | One view. Units 002 and 003 select from it; neither reimplements the chain.                                                  |
| **`unassigned` is normal**     | Falls out of the `LEFT JOIN`s as `null` + `'unassigned'` — never an error, never a missing row.                              |

Consumers:

- **Unit 002** reads `state`, `via_category`, `item_name`, `location_id` → the Placed /
  Inherited ("via Bakery") / Not-placed pills.
- **Unit 003** reads `location_id` → `location_position` → the shopping-list sort key, with
  `unassigned` items grouped last.

Both filter on `store_id = <the active store>`. RLS on the underlying tables narrows to the
caller's household before either filter applies.

---

## RPC: `reorder_location` (story 006, FR-9)

```sql
create function public.reorder_location(
  p_location_id  uuid,
  p_new_position integer
)
returns setof public.locations
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_store_id     uuid;
  v_old_position integer;
  v_count        integer;
begin
  select store_id, position
    into v_store_id, v_old_position
  from public.locations
  where id = p_location_id
  for update;

  if not found then
    raise exception 'Location % not found', p_location_id
      using errcode = 'P0002';
  end if;

  -- lock the whole store's path; only this store's rows ever move
  perform 1 from public.locations
   where store_id = v_store_id
   order by position
     for update;

  select count(*) into v_count
  from public.locations where store_id = v_store_id;

  if p_new_position < 1 or p_new_position > v_count then
    raise exception 'Position % out of range (1..%)', p_new_position, v_count
      using errcode = '22023';
  end if;

  if p_new_position <> v_old_position then
    if p_new_position > v_old_position then
      update public.locations set position = position - 1
       where store_id = v_store_id
         and position > v_old_position
         and position <= p_new_position;
    else
      update public.locations set position = position + 1
       where store_id = v_store_id
         and position >= p_new_position
         and position < v_old_position;
    end if;

    update public.locations set position = p_new_position
     where id = p_location_id;
  end if;

  return query
    select * from public.locations
     where store_id = v_store_id
     order by position;
end;
$$;
```

`grant execute on function public.reorder_location(uuid, integer) to authenticated;`

- **`security invoker`** — RLS applies to the caller, so the function needs no household
  argument and cannot be aimed at another household's Store. This is what the unit brief
  specifies and what the existing reorder RPC already does.
- **Store-scoped by derivation, not by parameter** — `v_store_id` is read from the target row,
  so no caller can shift a store it didn't name.
- **`FOR UPDATE` on the store's rows serialises concurrent reorders**, exactly as today's RPC
  does for the household's rows.
- **Out-of-range raises**, matching the existing function's behaviour; equal position is a
  no-op that still returns the ordered set.
- **The deferred unique constraint is what makes the bulk shift legal.** A non-deferrable
  `unique (store_id, position)` raises `23505` mid-statement while a range shifts, because
  Postgres checks uniqueness per row. `deferrable initially deferred` moves the check to
  commit, so the transient overlap inside the shift is fine and the constraint still holds for
  anyone outside the transaction.

⚠️ **Implement-stage verification**: the existing `reorder_grocery_store_row` solves this same
problem somehow — either with a deferred constraint or by parking the target at a sentinel
position. Stage 4 must read that function and **mirror whichever technique it uses**, rather
than introduce a second convention for the same problem. The design above assumes the deferred
constraint; if the existing RPC parks instead, adopt parking and drop `deferrable`.

---

## Security Design

| Concern                        | Approach                                                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tenant isolation**           | RLS enabled on all 5 tables. Four policies each (select / insert / update / delete), every one gating `household_id = public.current_user_household_id()` — the shape established by `20260828232000`. |
| **View bypassing RLS**         | `security_invoker = true` on `item_location_resolution`. Without it the view runs as owner and leaks every household. Explicitly tested in Stage 5.                                                    |
| **Cross-store placement**      | Composite FK, not a policy and not app code. Unwritable by any client, including a compromised one.                                                                                                    |
| **Cross-household placement**  | Composite FK through `household_id` on every parent reference.                                                                                                                                         |
| **Definer-function injection** | `fn_dinner_ingredients_sync_item` is `security definer` with `set search_path = public`.                                                                                                               |
| **RPC privilege escalation**   | `reorder_location` is `security invoker` — it holds no elevated rights and can only touch rows the caller could already touch. `execute` granted to `authenticated` only.                              |
| **Registry write path**        | `items` has no client-facing insert path in practice — Items appear only via the trigger. The insert policy exists for the cutover (bolt 051) and stays household-scoped.                              |

**No new RLS shape is introduced.** Stage 4 mirrors `20260828232000`'s policy naming and
predicate verbatim across all five tables — that migration is the reference, and matching it
exactly is a review criterion, not a stylistic preference.

---

## NFR Implementation

| Requirement                       | Design approach                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Performance**                   | Household-scale data — dozens of rows per table. The view's aggregate CTE is trivially small. Every join runs on an indexed key. No pagination needed. |
| **Correctness under concurrency** | Two paths matter: the registry (`on conflict do nothing`) and reorder (`FOR UPDATE`). Both are lock-or-conflict based, neither read-then-write.        |
| **Migration safety**              | Append-only, forward-only, one file, no prior migration edited. Creates only new objects — nothing existing is dropped or altered (that's bolt 051).   |
| **Type safety**                   | `database.types.ts` regenerated from the applied schema at the end of Stage 4; the view arrives as a typed row shape both downstream units import.     |
| **Multi-store readiness (v2)**    | `store_id` is real on every table from day one and the active-store index is partial. v2 is a UI change with no migration.                             |
| **Future recipe import**          | The trigger fires on the write, so an import path that doesn't exist yet needs no change here. This is the ADR-worthy property (unit brief).           |

---

## Integration Points

| Integration                                       | Direction | Contract                                                                                          |
| ------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `dinner_ingredients` → `items`                    | Inbound   | Trigger only. **No schema change to `dinner_ingredients`** — it is read, never altered.           |
| `dinners.household_id`                            | Inbound   | Read by the trigger to scope the Item. Pre-existing (intent 004).                                 |
| `households`                                      | Inbound   | FK parent of `stores` and `items`.                                                                |
| `current_user_household_id()`                     | Inbound   | The RLS predicate on all 5 tables. Pre-existing.                                                  |
| `item_location_resolution`                        | Outbound  | Units 002 and 003. The one shape both consume.                                                    |
| `reorder_location(uuid, integer)`                 | Outbound  | Unit 002's path-reorder controls.                                                                 |
| `grocery_store_rows` / `category_row_assignments` | —         | **Untouched by this bolt.** Both models coexist until bolt 051 cuts over and retires the old one. |

---

## Story Coverage

| Story                                   | Delivered by                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| **001**-stores-and-locations-schema     | `stores`, `locations`, partial active index, `unique (id, store_id)`, RLS ×2    |
| **002**-items-registry-and-sync-trigger | `items` + generated `name_key`, `fn_dinner_ingredients_sync_item` + its trigger |
| **003**-item-and-category-placements    | `item_placements`, `category_placements`, composite FKs, `NOT NULL location_id` |
| **004**-location-resolution-query       | `item_location_resolution` (+ OQ-1's modal-category rule)                       |
| **005**-suggestion-dismissals           | `suggestion_dismissals`                                                         |
| **006**-reorder-location-rpc            | `reorder_location` + the deferred `unique (store_id, position)`                 |

---

## Carried into Stage 4 (Implement)

1 - **Read `20260828232000`** and mirror its RLS policy naming and predicate exactly across
all five tables.
2 - **Read `reorder_grocery_store_row`** (`20260827040000`, household-scoped by
`20260828231000`) and mirror its shift technique — deferred constraint vs. sentinel parking —
rather than inventing a second convention.
3 - **Confirm `dinner_ingredients` has no timestamp column** (the premise of OQ-1's decision).
If one exists, re-open OQ-1 before writing the view.
4 - **Regenerate `database.types.ts`** after the migration applies.
5 - **Confirm `households(id)` is the correct FK parent** for `stores.household_id` and
`items.household_id`.

Items 1–3 are why Stage 2 does not read source code: they are exactly the questions that stage
answers, and each is recorded here rather than guessed at.

---

## Carried into Stage 3 (ADR Analysis)

Two candidates, both flagged by the unit brief and the Resolved Decisions:

1 - **The Items registry** — why a registry exists at all, why the dedup key is exact rather
than fuzzy, and why sync is a trigger rather than application code. The unit brief asks for
this explicitly so a future recipe-import intent reads it instead of re-deriving it.
2 - **Composite FKs as the containment mechanism** — using `unique (id, parent_id)` targets to
make cross-store and cross-household references unwritable, rather than checking them in
policies or app code. A reusable pattern this codebase hasn't recorded yet.
