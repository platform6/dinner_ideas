---
stage: model
bolt: 055-placement-review-state
created: '2026-09-05T18:00:00Z'
---

## Static Model: 001-placement-review-state

Scope note: this bolt owns **review state** and the corrections to intent 010's record. Stores,
Locations and Placements appear below only as context the model must sit correctly against —
they are unit 002's to change, not this bolt's.

### Entities

- **Item** — `household_id`, `name`, `name_key` (derived), `reviewed_at` (**new, nullable**).
  The registry entry for a grocery, one per distinct normalized name per household.
  Business rules:
  - Identity is `(household_id, name_key)`, not the display name. Two ingredients whose names
    differ only by case or surrounding whitespace are **the same Item**.
  - **`name` is trigger-owned.** Items come into existence as a consequence of a committed
    `dinner_ingredients` row, never by application request (ADR-7). This bolt must not change
    that, and must not weaken it as a side effect of adding `reviewed_at`.
  - `reviewed_at` is null at birth. Null means _nobody has looked at where this sits_ — it does
    **not** mean unplaced, and it does not mean wrong.
  - An Item outlives the ingredient rows that produced it. Nothing deletes Items.

- **Household** — context only. The ownership boundary for every Item and every placement. No
  change in this bolt.

- **DinnerIngredient** — context only. The thing whose creation causes an Item to exist, and
  whose `category` (NOT NULL, five permitted values) is what an Item's category is derived
  from. No change in this bolt.

### Value Objects

- **NameKey** — the normalization `lower(btrim(name))`. Equality by value; two Items with the
  same NameKey in the same Household are the same Item. Already exists; stated here because the
  review model depends on Item identity being stable across a rename **not** happening — see
  Domain Questions.

- **ReviewMark** — the fact that someone vetted an Item's placement, represented as an instant.
  Constraints:
  - Absent (null) or present. There is no "partially reviewed".
  - Monotonic in meaning, not in value: re-marking an already-reviewed Item is **allowed and
    inert**. Callers must never have to check first.
  - Carries no author. Deliberate: the question the queue answers is _"has anyone looked?"_,
    not _"who looked?"_. Adding a reviewer identity later would be additive.

- **Category** — one of `Produce`, `Protein`, `Dairy`, `Grains`, `Pantry`. Fixed set, enforced
  by a CHECK on `dinner_ingredients.category`. Context only; unchanged.

- **PlacementState** — `placed` | `inherited` | `unassigned`. Context only, but this bolt
  **corrects the requirement describing it** (story 003). See Ubiquitous Language.

### Aggregates

- **Item (aggregate root of itself)** — Members: the Item and its ReviewMark.
  Invariants:
  - **INV-1** — `name` is written only by the ingredient-sync trigger. No application path may
    write it. _(ADR-7; this bolt's principal risk.)_
  - **INV-2** — `reviewed_at` starts null for every newly registered Item, with no trigger
    change required.
  - **INV-3** — marking reviewed is idempotent and side-effect-free beyond the mark itself.
  - **INV-4** — a member of the owning Household may set `reviewed_at`; nobody else may.

- **Store** — context only. Root over Locations, ItemPlacements and CategoryPlacements. This
  bolt does not touch it. Named so the boundary is explicit: **review state belongs to the Item,
  not to the Store.** An Item reviewed once is reviewed, not reviewed-per-store. That is a
  simplification the model accepts while a household has exactly one active Store, and it is
  recorded here as such rather than assumed silently — see Domain Questions.

### Domain Events

- **ItemRegistered** — Trigger: a `dinner_ingredients` row is committed with a name not yet in
  the household registry. Payload: `household_id`, `name`. Consequence: an Item exists with
  `reviewed_at` null, and therefore appears in the review queue.

- **ItemReviewed** — Trigger: a household member accepts the Item's current stop, or moves it.
  Payload: `item_id`, instant. Consequence: the Item leaves the review queue. Re-raising the
  event for an already-reviewed Item is legal and changes nothing observable.

- **RegistryBackfilled** — Trigger: this bolt's migration. Payload: the set of Item ids that
  existed when the backfill began. Consequence: exactly those Items are marked reviewed.
  **Items registered during the migration window are deliberately excluded** — they are new,
  and the queue is where new things belong.

### Domain Services

- **ReviewMarking** — Operations: `markReviewed(itemId)`. Dependencies: Item repository,
  household authorization. Notes: idempotent by contract, so every UI entry point (accept,
  move, place) can call it unconditionally. This is the only new write in the bolt.

- **RegistryBackfill** — Operations: `backfillExisting()`. Dependencies: Item repository.
  Notes: a one-time migration concern, not a runtime service.

  > **⚠️ SUPERSEDED at Stage 2.** This paragraph originally argued the correctness condition was
  > a **bound** — a set fixed before any concurrent registration could join it. That is wrong.
  > Under READ COMMITTED the statement already sees only rows committed before its own snapshot,
  > so a row committing after it stays null for free; a row committing before it is
  > indistinguishable from a genuinely pre-existing one by any means the database has. The bound
  > relocates the window rather than narrowing it. See `ddd-02-technical-design.md` → Data Model
  > → Backfill.

### Repository Interfaces

- **ItemRepository** — Entity: Item
  - `markReviewed(itemId) -> void` — idempotent; rejects cross-household callers
  - `findUnreviewed(householdId) -> Item[]` — drives unit 002's queue
  - ~~`existingIdsSnapshot() -> ItemId[]`~~ — dropped at Stage 2; the bound bought nothing
  - **Not offered**: any operation that writes `name`. Its absence is the design.

### Ubiquitous Language

- **Registry** — the set of Items a household has ever had an ingredient for. Grows; never
  shrinks on its own.
- **Item** — one grocery in the registry, identified by its normalized name.
- **Stop** — a Location on the walking path. User-facing word for where a thing is found.
- **Placed** — the household chose this Item's stop explicitly.
- **Inherited** — the Item's stop follows from its category's placement. **The normal state**,
  and correct far more often than not.
- **Unassigned** — the Item resolves to no stop at all. Reachable **only** for an orphan.
- **Orphan** — an Item with no surviving `dinner_ingredients` rows, e.g. after its dinner was
  deleted. The only way an Item becomes unassigned.
- **Reviewed** — someone looked at where this Item sits and either accepted it or moved it.
  Distinct from _placed_: **accepting an inherited stop is a review, not a placement.** This
  distinction is the whole point of the bolt.
- **Unreviewed / New** — `reviewed_at is null`. What the queue lists.
- **Vetted** — informal synonym for reviewed. Prefer "reviewed" in code and copy.

### The correction this bolt makes to intent 010's language

Intent 010 FR-6 describes `unassigned` as _"a normal state, not an error, everywhere it
appears"_. In the model above that is false: because `dinner_ingredients.category` is NOT NULL
over five values and all five carry placements, **every Item is `inherited`** and `unassigned`
is reachable only for orphans. Story 003 corrects the requirement to say so.

The word that FR-6 was reaching for — a normal, common, unalarming state that the UI should
surface neutrally — is **unreviewed**, which this bolt introduces. That is the substantive
reason the correction belongs in this bolt rather than being filed as a documentation chore.

### Domain Questions (for Stage 2)

1. **Does renaming an ingredient mint a new Item?** Item identity is NameKey. If the sync
   trigger fires on a name change, a rename produces a **new** Item (unreviewed, entering the
   queue) and leaves the old one an **orphan** (unassigned). If so, editing a typo would put a
   spurious row in the queue and leave litter in the registry. The model says this follows from
   identity-by-NameKey; Stage 2 must decide whether it is acceptable, and Stage 4 must confirm
   the actual trigger behaviour.
2. **Is review per-Item or per-Store?** Modelled per-Item above. Correct while a household has
   one active Store. If multiple Stores ever exist, "reviewed" would need a store dimension —
   an Item's placement can be right at one store and wrong at another. Recording the
   simplification, not resolving it.
3. **Does the resolution view carry `reviewed_at`, or is it read alongside?** A projection
   question, not a domain one. Stage 2 decides.

### Completion Criteria

- [x] All domain entities identified and documented
- [x] Business rules captured for each entity
- [x] Value objects defined with constraints
- [x] Aggregate boundaries and invariants stated
- [x] Domain events captured with triggers and payloads
- [x] Domain services defined
- [x] Repository contracts defined — including the operation deliberately **not** offered
- [x] Ubiquitous language documented, including the term intent 010 was missing
