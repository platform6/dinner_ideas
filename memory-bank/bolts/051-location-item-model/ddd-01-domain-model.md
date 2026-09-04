---
unit: 001-location-item-model
bolt: 051-location-item-model
stage: model
status: complete
updated: '2026-09-04T19:56:26Z'
---

# Static Model - Location/Item Model Cutover

## Bounded Context

Same context as bolt 050 — **Store Layout & Placement** — but this bolt models a different
kind of thing. Bolt 050 built the steady-state domain. This bolt models a **one-time
transformation**: the translation of the retired Category→Row model into the new one, and the
statement of what it means for that translation to be _correct_.

The domain object here is not an entity. It is an **equivalence claim**:

> Every household's shopping list must sort the same way after the cutover as it did before,
> for the same data — using none of the same tables to do it.

Everything in this bolt exists to make that claim true and to prove it.

### What is being retired

| Retired concept             | Replaced by                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `grocery_store_rows`        | `locations` (under a seeded Store), gaining a `type` and a Store scope                                                  |
| `category_row_assignments`  | `category_placements`, gaining a Store scope                                                                            |
| _(nothing — did not exist)_ | `items`, `item_placements`, `suggestion_dismissals` — the new capability, deliberately **empty of user decisions** here |

The old model could only express "this whole category goes here." The new model can express
that _and_ "this specific ingredient goes there." The cutover carries the first faithfully and
creates **none** of the second — day one must look identical, not improved.

---

## Domain Entities

This bolt introduces **no new entities**. It operates on bolt 050's entities and on the two
retired tables. What it introduces are _transformations_, each of which must be total and
order-preserving.

| Transformation           | Input                                            | Output                                          | Business Rules                                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **StoreSeeding**         | every Household                                  | exactly one active Store                        | Total — every household gets one, including a household with no rows at all (it gets an empty Store and the first-run UI). Exactly one, never two. `is_active = true`.                                                                                 |
| **PathCarryAcross**      | a Household's `grocery_store_rows`               | `locations` under that Household's seeded Store | `name` preserved verbatim; `position` preserved verbatim; `type` **inferred**. The old table was already `unique (household_id, position)`, so the new `(store_id, position)` uniqueness is satisfied by construction — no renumbering, no collisions. |
| **PlacementCarryAcross** | a Household's `category_row_assignments`         | `category_placements` for the same Store        | One row per assignment; the referenced Location is the carried-across Location of the old `row_id`. Mapping must be by **row identity**, not by name.                                                                                                  |
| **RegistryBackfill**     | a Household's distinct `dinner_ingredients.name` | `items`                                         | One Item per distinct `NameKey` per Household. Reuses bolt 050's exact dedup — the backfill and the trigger must agree perfectly, or the registry has two definitions of identity.                                                                     |
| **OldModelRetirement**   | `grocery_store_rows`, `category_row_assignments` | (dropped)                                       | Only after every row above is confirmed carried across. Forward-only; no prior migration file is edited.                                                                                                                                               |

### The transformation that creates nothing

**`item_placements` receives zero rows.** This is a rule, not an omission. The old model had no
per-ingredient placement, so there is nothing to carry, and inventing one would mean guessing a
user decision that was never made. Every Item resolves as `inherited` (or `unassigned`) on day
one, which is exactly the behaviour the old model had.

---

## Value Objects

| Value Object           | Properties                                                            | Constraints                                                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **InferredType**       | the `LocationType` guessed from an old row's `name`                   | A one-time heuristic: a name matching an aisle-number pattern → `aisle`; anything else → `section`. **Lossy by nature and that is acceptable** — the result is user-editable immediately afterward, so a wrong guess costs one tap, never data. |
| **ResolvedOrder**      | the sequence of `(ingredient → position)` a household's list sorts by | The unit of the equivalence claim. Computed under the old model _before_ cutover and under the new model _after_, and compared. Equality of this value is what "no regression" means.                                                           |
| **CarryAcrossMapping** | old `grocery_store_rows.id` → new `locations.id`, per household       | Must be injective and total. It is the join that makes `PlacementCarryAcross` correct; losing it would force name-matching, which is not identity.                                                                                              |

---

## Aggregates

No new aggregates. The cutover writes into the **Store** aggregate (Locations,
CategoryPlacements) and the **Item** aggregate (registry rows), and must leave both satisfying
every invariant bolt 050 defined:

| Bolt 050 invariant                                  | How the cutover must respect it                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ≤1 active Store per Household                       | Seed exactly one; a re-run must not seed a second                                      |
| `position` unique and contiguous within a Store     | Inherited free from the old table's own `(household_id, position)` uniqueness          |
| Every placement names a Location of its own Store   | Guaranteed by the composite FK — the cutover cannot violate it even by mistake (ADR-8) |
| One Item per `(household, name_key)`                | The backfill uses the same `on conflict` target as the trigger                         |
| An Item is never created as a side effect of layout | Registry backfill and path carry-across are independent passes                         |

**The cutover is a client of the invariants, not an exception to them.** Nothing here needs a
constraint relaxed — a notable property, and the main evidence the bolt 050 schema was shaped
correctly.

---

## Domain Events

| Event                       | Trigger                                     | Payload                        | Realized as                                                 |
| --------------------------- | ------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| **StoreSeeded**             | The cutover runs for a Household            | `household_id`, `store_id`     | The seam bolt 050 named but deliberately left unimplemented |
| **PathCarriedAcross**       | A Household's rows become Locations         | `household_id`, count, mapping | One `insert … select` per household                         |
| **PlacementsCarriedAcross** | A Household's assignments become placements | `household_id`, count          | `insert … select` joined through `CarryAcrossMapping`       |
| **RegistryBackfilled**      | Distinct ingredient names become Items      | `household_id`, count          | `insert … select distinct … on conflict do nothing`         |
| **OldModelRetired**         | The retired tables are dropped              | —                              | Terminal. After this, the old model cannot be read again.   |

`OldModelRetired` is the only irreversible event in either bolt. Everything before it is
additive; this one destroys the source data. Its ordering relative to the equivalence check is
the single most important sequencing decision in this bolt (see Open Questions).

---

## Domain Services

| Service                 | Operations                                                                                   | Dependencies                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **CutoverExecution**    | `seedStores()`, `carryPath()`, `carryPlacements()`, `backfillRegistry()`, `retireOldModel()` | Both models, simultaneously — the only code that ever sees both |
| **EquivalenceVerifier** | `resolvedOrderBefore()`, `resolvedOrderAfter()`, `assertEquivalent()`                        | The old model's sort logic; bolt 050's resolution view          |

### EquivalenceVerifier — the reason this bolt is risky

Bolt 050's tests could assert _correctness against a specification_. This bolt must assert
something harder: **equivalence to a system that is about to stop existing.**

The old model's sort was: an ingredient's `category` → `category_row_assignments` → a row's
`position`. The new model's is: an ingredient → its Item → `category_placements` (inherited) →
a Location's `position`. These are different mechanisms that must produce the _same ordering_
for the same data.

The claim is specifically about **order**, not identity: Location ids differ, table names
differ, and the new model returns a richer shape. What must match is the sequence a shopping
list comes out in.

The verification has a hard constraint the rest of the bolt does not: it can only be performed
while **both** models exist. Once `OldModelRetired` fires, the baseline is gone and the claim
becomes unfalsifiable.

---

## Repository Interfaces

The cutover is a migration, not application code — it has no repository layer and no client.
The interfaces below describe what it must be able to _read_, and are listed because two of
them cease to exist when it finishes:

| Repository                      | Entity                     | Methods                           | Lifetime                   |
| ------------------------------- | -------------------------- | --------------------------------- | -------------------------- |
| **HouseholdRepository**         | Household                  | `all()`                           | Permanent                  |
| **LegacyRowRepository**         | `grocery_store_rows`       | `byHousehold()`                   | **Destroyed by this bolt** |
| **LegacyAssignmentRepository**  | `category_row_assignments` | `byHousehold()`                   | **Destroyed by this bolt** |
| **IngredientNameRepository**    | `dinner_ingredients`       | `distinctNamesByHousehold()`      | Permanent (read-only)      |
| _(bolt 050's six repositories)_ | —                          | write access for the carry-across | Permanent                  |

---

## Ubiquitous Language

| Term                 | Definition                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cutover**          | The one-time, forward-only transformation of the old model into the new one. Not a sync, not a dual-write — it runs once and the old model is gone.  |
| **Carry across**     | To translate existing configuration so it means the same thing in the new model. Deliberately not "migrate" (ambiguous) or "convert" (implies loss). |
| **Seed**             | To create a Store where a Household had none. Distinct from carry-across: seeding creates, carrying translates.                                      |
| **Backfill**         | To populate the registry from data that predates the trigger. A one-time catch-up; the trigger handles everything after.                             |
| **Inferred type**    | A Location's `section`/`aisle` guess from its old name. Explicitly a guess, explicitly editable.                                                     |
| **Equivalent order** | The property that must hold: the same shopping list sorts the same way, before and after, for the same data.                                         |
| **Retire**           | To drop a table whose data has been confirmed carried across. Irreversible.                                                                          |
| **Day-one state**    | What a household sees immediately post-cutover: their path intact, every ingredient `inherited` or `unassigned`, zero explicit placements.           |

---

## Story Coverage

| Story                               | Covered by                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **007**-cutover-migration           | All five transformations; `InferredType`, `CarryAcrossMapping`, `ResolvedOrder`; `CutoverExecution` and `EquivalenceVerifier`; the zero-`item_placements` rule |
| **008**-standards-and-decision-docs | The "What is being retired" table and the Ubiquitous Language are the source material; the docs restate this model for a future reader                         |

---

## Open Questions for Stage 2

1 - **When is the equivalence check performed relative to retirement?** The verifier needs both
models alive; retirement destroys the baseline. Either retirement moves to a second migration
(as `004-account-model` split its schema and data migrations), or the check runs inside the
same transaction before the drop, or the check lives only in tests against a fixture. Stage 2
must choose — this is the bolt's central sequencing decision and the one with real regression
risk.

2 - **What exactly is the aisle-number pattern?** `InferredType` is defined here as "matches an
aisle-number pattern," which is a domain statement, not a regex. Stage 2 must pin the pattern
and the casing/whitespace tolerance after looking at the actual seeded row names.

3 - **Does the founding household need special handling?** ADR-3 established a
resolve-the-owner-or-abort pattern for the last cutover, with a dev-bootstrap branch. Stage 2
must decide whether this cutover needs the same care or whether it is safely per-household and
data-driven — it has no owner to resolve, which suggests the latter.

4 - **Is retirement in scope at all?** Story 007 permits "same migration or a documented
follow-up." Dropping the old tables while unit 002's UI still reads them would break the app
between deploys. Stage 2 must confirm the sequencing against what units 002/003 have and have
not yet shipped.
