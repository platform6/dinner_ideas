---
unit: 001-location-item-model
bolt: 050-location-item-model
stage: model
status: complete
updated: '2026-09-04T17:17:34Z'
---

# Static Model - Location/Item Model

## Bounded Context

**Store Layout & Placement** — the household's answer to _"where in my store does this
ingredient live, and in what order do I walk past it?"_

This context owns the walking path (Stores, Locations), the ingredient-name registry (Items),
and the two levels of placement that connect them. It owns **resolution** — the single
authoritative answer to "where does this Item sort?" — and nothing else may re-derive that
logic.

### Context boundaries

| Neighbour                                                       | Relationship        | What crosses the boundary                                                                                                   |
| --------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Dinner Catalog** (`dinners`, `dinner_ingredients`) — upstream | Conformist, one-way | Ingredient `name` (becomes an Item) and `category` (drives inheritance). This context **reads** it and **never writes** it. |
| **Account Model** (`households`) — upstream                     | Conformist          | `household_id` is the tenancy key on every entity here; `current_user_household_id()` is the RLS predicate.                 |
| **Store Config UI** (unit 002) — downstream                     | Customer/supplier   | Consumes every entity + the resolution read model + the reorder operation.                                                  |
| **Shopping List Ordering** (unit 003) — downstream              | Customer/supplier   | Consumes **only** the resolution read model, for the sort key.                                                              |

**Anti-corruption note**: `dinner_ingredients` is free text with no stable identity. The Item
registry is this context's own model of that upstream data — _derived from_, not _shared
with_, the Dinner Catalog. The derivation runs one-way and automatically (see
`ItemRegistrySync`), so no upstream code path is ever aware this context exists.

---

## Domain Entities

| Entity                  | Properties                                                       | Business Rules                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store**               | `id`, `household_id`, `name`, `is_active`, `created_at`          | Belongs to exactly one Household. **At most one active Store per Household** (v1 always has exactly one). Deleting a Store destroys its whole layout — Locations and every placement under it — but no Items. Stores of different Households never interact.                                                           |
| **Location**            | `id`, `household_id`, `store_id`, `name`, `type`, `position`     | A stop on one Store's walking path. `position` is **unique within its Store** and orders the path as a _single interleaved sequence_ — `type` never sub-orders it. `name` is free text; a name with no parseable number is still valid. `type` is **never derived** from `name`.                                       |
| **Item**                | `id`, `household_id`, `name`, `name_key` (derived), `created_at` | The household's registry of distinct ingredient names. Identity is `name_key`, not `name` — **one Item per `(household, name_key)`**. Created only by get-or-create, never by hand. **Never deleted** by any operation in this bolt: not by deleting a Location, not by clearing a placement, not by editing a dinner. |
| **ItemPlacement**       | `id`, `household_id`, `store_id`, `item_id`, `location_id`       | An Item's **explicit** placement — a decision the user made. At most **one per `(Item, Store)`**; re-placing updates, never duplicates. Its Location **must belong to its own Store** — structurally impossible otherwise. `location_id` is never null while the row exists.                                           |
| **CategoryPlacement**   | `id`, `household_id`, `store_id`, `category`, `location_id`      | A category's default Location — the **inherited** fallback. At most **one per `(Store, category)`**. `category` is the same free-text set already used by `dinner_ingredients.category`; there is no category entity to reference. Same same-Store and never-null rules as ItemPlacement.                              |
| **SuggestionDismissal** | `id`, `household_id`, `store_id`, `item_id`, `suggested_item_id` | A remembered "no" — this exact pairing was rejected in this Store and must never be offered again. At most one per `(Store, item, suggested_item)`; a repeat dismissal is a no-op. Meaningless once either Item ceases to exist. Directional: dismissing A→B says nothing about B→A.                                   |

### Rules that span entities

| Rule                                                                                                                              | Where it is enforced                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A placement can never point at another Store's Location                                                                           | Schema (composite FK), not application code — **ADR-1**       |
| "No placement" is the **absence of a row**, never a row with a null Location                                                      | `location_id NOT NULL` + cascade-delete (Resolved Decision 3) |
| Deleting a Location removes the placements that named it; affected Items fall _further down_ the resolution chain, never orphaned | Cascade on the Location FK                                    |
| An Item exists the moment its name is first written, by **any** caller                                                            | Trigger, not application code — **ADR-2**                     |
| Every entity here is readable and writable only within its own Household                                                          | RLS on every table, mirroring the established household shape |

---

## Value Objects

| Value Object           | Properties                                                | Constraints                                                                                                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NameKey**            | the normalized form of an Item name: `lower(trim(name))`  | Equality by value — this _is_ Item identity within a Household. Deterministic and source-agnostic: the same text from manual entry or a future import yields the same key. Deliberately **exact** (case and surrounding whitespace only), never the fuzzy similarity normalization (Resolved Decision 2). |
| **LocationType**       | `section` \| `aisle`                                      | Closed set. Affects **display only**. Two Locations of different type are peers in one ordered sequence.                                                                                                                                                                                                  |
| **Position**           | integer ordinal of a Location within its Store            | Unique per Store; contiguous — reordering renumbers rather than leaving gaps. Meaningless outside its Store.                                                                                                                                                                                              |
| **IngredientCategory** | free-text category string carried by `dinner_ingredients` | Not owned here — read from upstream. No enum, no FK, no categories table. An Item's category is **derived**, not stored (see Open Question 1).                                                                                                                                                            |
| **PlacementState**     | `placed` \| `inherited` \| `unassigned`                   | Exhaustive and mutually exclusive. **`unassigned` is a normal state, never an error** — no operation may fail or warn because of it.                                                                                                                                                                      |
| **ResolvedPlacement**  | `{ location_id \| null, state, via_category \| null }`    | The output of resolution. `location_id` is null **iff** `state = unassigned`. `via_category` is populated **iff** `state = inherited` — it is what lets the UI say "via Bakery".                                                                                                                          |

---

## Aggregates

| Aggregate Root | Members                                                                                    | Invariants                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store**      | Store, its Locations, its ItemPlacements, its CategoryPlacements, its SuggestionDismissals | 1. `position` is unique across the Store's Locations, and the sequence stays contiguous through add / reorder / delete. 2. Every placement under this Store names a Location **of this Store**. 3. ≤1 ItemPlacement per Item. 4. ≤1 CategoryPlacement per category. 5. ≤1 SuggestionDismissal per ordered `(item, suggested_item)` pair. 6. Deleting the Store deletes all of the above — and no Items. |
| **Item**       | Item (alone)                                                                               | 1. `name_key` is unique within the Household. 2. Lifecycle is **independent of every Store**: an Item is never created, deleted, or modified as a side effect of a layout change. 3. Items are referenced from the Store aggregate **by id only**.                                                                                                                                                      |

### Why placements live in the Store aggregate, not the Item aggregate

A placement names an `(Item, Location)` pair, so it could plausibly belong to either
aggregate. It is modelled under **Store** because every invariant that constrains it is a
Store-side invariant — same-Store containment, one-per-Store uniqueness, cascade on Location
delete. The Item side constrains nothing about it.

This also produces the right lifecycle: a Store can be wiped without touching the registry —
exactly what the cutover (bolt 051) and multi-store v2 need.

Consequence: **the two aggregates are updated in separate transactions**, and the Store
aggregate holds only an Item _id_. That is the correct boundary, and it is also what the
trigger-based registry sync requires — an ingredient write creates an Item with no Store
involved at all.

---

## Domain Events

This app has no event bus. The events below are **domain facts realized as database
mechanisms** (triggers, cascades) — the pattern ADR-1 and ADR-2 established for this codebase.
They are named here because they are how the model reasons, and because naming them is what
makes "which caller did it?" the wrong question.

| Event                    | Trigger                                                                                                | Payload                                       | Realized as                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------- |
| **ItemRegistered**       | An ingredient name is written (insert, or name-change update) whose `NameKey` is new for the Household | `household_id`, `item_id`, `name`             | Trigger on `dinner_ingredients` → get-or-create (**ADR-2**)     |
| **ItemNameSeen**         | The same write, when the `NameKey` already exists                                                      | `household_id`, existing `item_id`            | The no-op branch of the same get-or-create — silently correct   |
| **ItemPlaced**           | A user places an Item at a Location                                                                    | `store_id`, `item_id`, `location_id`          | Upsert on the `(item, store)` uniqueness                        |
| **ItemPlacementCleared** | An explicit placement is removed                                                                       | `store_id`, `item_id`                         | Row delete → the Item falls back to `inherited` or `unassigned` |
| **CategoryPlaced**       | A category's default Location is set or changed                                                        | `store_id`, `category`, `location_id`         | Upsert on the `(store, category)` uniqueness                    |
| **LocationReordered**    | A Location moves to a new position                                                                     | `store_id`, `location_id`, old/new `position` | The reorder operation; renumbers the affected range atomically  |
| **LocationRemoved**      | A Location is deleted                                                                                  | `store_id`, `location_id`                     | Cascade discards its placements — **Items are untouched**       |
| **SuggestionDismissed**  | A user rejects a similarity pairing                                                                    | `store_id`, `item_id`, `suggested_item_id`    | Insert, idempotent on the uniqueness                            |
| **StoreSeeded**          | A Household gains its first Store                                                                      | `household_id`, `store_id`                    | **Out of scope here** — bolt 051 (cutover + new-household seed) |

---

## Domain Services

| Service                | Operations                                                                                                            | Dependencies                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **LocationResolution** | `resolve(item, store) → ResolvedPlacement`; `resolveAll(store) → ResolvedPlacement[]` for every Item in the Household | ItemPlacements, CategoryPlacements, Items, upstream ingredient category  |
| **LocationReordering** | `reorder(location, newPosition) → the Store's reordered Locations`                                                    | Locations of one Store, exclusively                                      |
| **ItemRegistrySync**   | `getOrCreate(household, name) → Item` — invoked by the domain itself, never by a caller                               | Items; resolves `household_id` by following the ingredient to its dinner |

### LocationResolution — the rule this whole bolt exists to make unambiguous

```text
for an (Item, Store):

  1. an ItemPlacement for (item, store)?        → placed      at that Location
  2. else a CategoryPlacement for               → inherited   at that Location
       (item's category, store)?                              (via_category = that category)
  3. else                                       → unassigned  (location = null)
```

Three properties are non-negotiable, because unit 002 (display) and unit 003 (sort key) both
consume this and **must never disagree**:

- **Total** — every Item resolves. There is no fourth outcome, no error, no null crash.
- **Ordered** — explicit always beats inherited; inherited always beats nothing.
- **Singular** — this logic lives in exactly one place. Neither downstream unit re-derives it.

Both consumers read the _same shape_: unit 002 reads `state` (to render Placed / Inherited /
Not placed) and `via_category`; unit 003 reads `location_id`, then that Location's `position`,
as its sort key.

### LocationReordering — why it is a service, not an entity method

Moving one Location renumbers its neighbours, so the operation's unit of consistency is the
**whole Store's Location set**, not a single Location. It must also be safe against concurrent
callers. Both facts push it out of the entity and into one atomic domain operation scoped by
`store_id` — the generalization of the pattern already proven for the current model (Resolved
Decision 4). Reordering never crosses a Store boundary: another Store's positions must be
provably untouched.

### ItemRegistrySync — the domain's own reflex

This is the one service **no caller ever calls**. Its correctness condition is precisely that
it is unavoidable: an Item exists because an ingredient name was written, regardless of which
code path wrote it — today's manual dinner entry, or a recipe-import feature that does not yet
exist. Putting it in application code would make it a rule today's callers happen to follow;
putting it on the write itself makes it a property of the data (**ADR-2**, and the reason the
unit brief asks for a standalone ADR here).

It resolves the Household by following the ingredient to its dinner, which crosses the RLS
boundary — the same shape as the cross-table trigger functions this codebase already runs.

---

## Repository Interfaces

This app has no repository layer: the "repository" is the Supabase table / view / RPC surface
consumed directly by React Query hooks in units 002 and 003. The interfaces below are
therefore the **contract this bolt must publish**, stated in domain terms; Stage 2 maps each
to its concrete surface.

| Repository                        | Entity              | Methods                                                                                                                             |
| --------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **StoreRepository**               | Store               | `activeForHousehold()`                                                                                                              |
| **LocationRepository**            | Location            | `listByStore(store)` (ordered by position), `add`, `rename`, `changeType`, `remove`, `reorder` → service                            |
| **ItemRepository**                | Item                | `listByHousehold()`, `findByNameKey(name)` — **no create, no delete** (creation belongs to the trigger; deletion belongs to nobody) |
| **ItemPlacementRepository**       | ItemPlacement       | `place(item, location)` (upsert), `clear(item, store)`, `listByStore(store)`                                                        |
| **CategoryPlacementRepository**   | CategoryPlacement   | `place(category, location)` (upsert), `clear(category, store)`, `listByStore(store)`                                                |
| **SuggestionDismissalRepository** | SuggestionDismissal | `dismiss(item, suggestedItem, store)` (idempotent), `listByStore(store)`                                                            |
| **PlacementResolutionQuery**      | _(read model)_      | `resolveAll(store) → ResolvedPlacement[]` — read-only; the single shape both downstream units consume                               |

`ItemRepository` having no `create` is the model stating its own invariant: application code
cannot mint an Item, so it cannot mint a duplicate or a wrongly-scoped one.

---

## Ubiquitous Language

| Term                | Definition                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Walking Path**    | The user-facing name for a Store's ordered list of Locations — the route through the shop, top to bottom.                                                            |
| **Store**           | One complete, independent layout belonging to a Household. Exactly one is active in v1.                                                                              |
| **Location**        | A stop on the Walking Path. Replaces the old "Row".                                                                                                                  |
| **Section / Aisle** | The two Location **types**. A display distinction only — they are peers in one sequence.                                                                             |
| **Position**        | A Location's ordinal on the Path. Unique within a Store.                                                                                                             |
| **Item**            | A distinct ingredient name known to a Household — the stable identity `dinner_ingredients` never had.                                                                |
| **Registry**        | The set of all Items for a Household. Grows automatically; nothing prunes it.                                                                                        |
| **`name_key`**      | An Item's normalized identity, `lower(trim(name))`. Two names differing only in case or surrounding whitespace **are the same Item**.                                |
| **Placement**       | A statement that something belongs at a Location. Explicit (an Item) or inherited (a category).                                                                      |
| **Placed**          | Resolution state: this Item has its own explicit Placement — a decision the user made.                                                                               |
| **Inherited**       | Resolution state: no explicit Placement, but the Item's category has one. Legible in the UI as "via {category}".                                                     |
| **Unassigned**      | Resolution state: neither. **A normal state, not an error** — never red, never warning-styled, never blocking.                                                       |
| **Resolution**      | Applying explicit → inherited → unassigned to get an Item's `ResolvedPlacement`. The single source of ordering truth for both the config page and the shopping list. |
| **Suggestion**      | An offer to place an Item like a similar, already-placed one. Always one tap to accept — **never** auto-applied. (The scoring itself is unit 002's.)                 |
| **Dismissal**       | A remembered rejection of one Suggestion pairing in one Store. Suppresses that pairing permanently.                                                                  |
| **Household**       | The tenancy boundary. Every entity here carries `household_id`; nothing is ever visible across Households.                                                           |
| **Cutover**         | The one-time carry-across of the existing Rows/Assignments model into this one. **Bolt 051, not this bolt.**                                                         |

---

## Story Coverage

| Story                                   | Covered by                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **001**-stores-and-locations-schema     | Entities Store, Location; `LocationType`, `Position`; Store-aggregate invariants 1 and 6; `StoreRepository`, `LocationRepository` |
| **002**-items-registry-and-sync-trigger | Entity Item; `NameKey`; Item-aggregate invariants; `ItemRegistrySync`; `ItemRegistered` / `ItemNameSeen`; `ItemRepository`        |
| **003**-item-and-category-placements    | Entities ItemPlacement, CategoryPlacement; Store-aggregate invariants 2–4; cross-entity rules table; both placement repositories  |
| **004**-location-resolution-query       | `LocationResolution`; `PlacementState`, `ResolvedPlacement`; `PlacementResolutionQuery`                                           |
| **005**-suggestion-dismissals           | Entity SuggestionDismissal; Store-aggregate invariant 5; `SuggestionDismissed`; `SuggestionDismissalRepository`                   |
| **006**-reorder-location-rpc            | `LocationReordering`; `Position`; Store-aggregate invariant 1; `LocationReordered`                                                |

Stories 007 (cutover) and 008 (standards docs) belong to bolt **051** and are deliberately
absent — `StoreSeeded` is named above only to mark the seam.

---

## Open Questions for Stage 2

Technical-design decisions, deliberately left unresolved by the static model:

1 - **How an Item acquires its category.** An Item stores no category — it is derived by
following `name_key` back to the upstream `dinner_ingredients` rows that produced it, and
those rows may disagree across dinners. `requirements.md` records the assumption ("most recent
/ first-seen, applied consistently") but does not pick one. **Stage 2 must pick one and state
it**, because the inherited branch of resolution depends on it entirely.

2 - **Whether resolution is a view or a composed query.** Story 004 explicitly permits either.
The model's only requirement is _singularity_ — one definition, two consumers.

3 - **Where the Household is denormalized.** Every entity carries `household_id` for RLS
simplicity even where it is reachable through a parent FK. Stage 2 pins the exact shape of
that redundancy and how it is kept honest.
