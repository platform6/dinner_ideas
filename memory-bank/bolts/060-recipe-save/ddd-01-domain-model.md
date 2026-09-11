---
stage: model
bolt: 060-recipe-save
created: '2026-09-08T22:44:00Z'
---

## Static Model: 001-recipe-manual-entry (the save)

Bolt 059 built the surface. This bolt asks a narrower question: **what is a Dinner, such that
"half of one" is not a thing that can exist?**

The answer decides the mechanism, so the mechanism is deliberately not named here. Stage 2 designs
it; stage 3 argues it.

---

### Entities

- **Dinner** — `name`, `cuisineType`, `cookTimeMinutes`, `summary`, `householdId`, `isActive`.
  The thing the catalog lists. Business rules: the name is unique within its household; cook time
  is a whole number of minutes greater than zero; it belongs to exactly one household and never
  moves between them.

- **IngredientLine** — `quantity`, `unit`, `name`, `category`. What the dinner takes, in the
  quantities that feed three people. Has no meaning apart from its Dinner: an ingredient line
  belonging to nothing is not a fact about the world.

- **CookingStep** — `stepNumber`, `instruction`. One discrete instruction. Its identity within a
  Dinner _is_ its position; two steps of one Dinner never share a number.

- **Tag** — `name`, `householdId`. A shared, household-wide vocabulary word. Unlike the two above,
  a Tag **outlives** any dinner that uses it and is shared across all of them. This is the one
  entity here that is not owned by a Dinner.

- **GroceryItem** — the registry entry an ingredient name resolves to on the walking path.
  **Named here only to place it outside this model's boundary.** It is maintained by a database
  trigger (ADR-7) and no application code in this unit may write it.

---

### Value Objects

- **RecipeDraft** — the whole unsaved recipe: dinner fields, ordered lines, ordered steps,
  tag names. Equality by value; two drafts with the same contents are the same draft. Built in
  bolt 059 and deliberately serializable, because unit 002 produces one.

- **DinnerName** — trimmed text. Constraint: **unique within a household**. Note that this is not
  a constraint the Dinner can check about itself — see Invariants below.

- **Quantity** — a positive number, not necessarily whole (half a pound is ordinary).

- **StepNumber** — a positive integer, **derived from position** rather than stored on the draft.
  Contiguity from 1 is a property of the sequence, not of any one step.

- **TagName** — trimmed, lowercased. Two names differing only by case or surrounding space are the
  same TagName. Nothing else is normalized: `Quick Meal` and `quick-meal` are genuinely different
  words in this vocabulary.

- **IngredientCategory** — one of exactly five: Produce, Protein, Dairy, Grains, Pantry. A closed
  set; free text is not a member.

---

### Aggregates

**Dinner is the aggregate root.** Members: its IngredientLines and its CookingSteps, plus the
links to its Tags. The Tags themselves are outside — the aggregate owns the _attachment_, not the
word.

**Invariants:**

| #     | Invariant                                           | Scope                |
| ----- | --------------------------------------------------- | -------------------- |
| INV-1 | A Dinner has **at least one** IngredientLine        | within the aggregate |
| INV-2 | A Dinner has **at least one** CookingStep           | within the aggregate |
| INV-3 | Its step numbers are contiguous from 1              | within the aggregate |
| INV-4 | Every quantity > 0; cook time is a whole number > 0 | within the aggregate |
| INV-5 | Every category is one of the five                   | within the aggregate |
| INV-6 | A Tag is attached to a Dinner at most once          | within the aggregate |
| INV-7 | `householdId` is the caller's, on every member      | within the aggregate |
| INV-8 | The name is unique among that household's Dinners   | **across the set**   |

**The consequence that matters:** INV-1 through INV-7 are properties of a _complete_ Dinner.
A row in the catalog with no ingredients does not satisfy INV-1, so **it is not a Dinner that
happens to be incomplete — it is not a Dinner at all.**

That is the whole finding of this stage. The aggregate boundary and the transaction boundary are
the same boundary, and they are the same because of what a Dinner _is_, not because of what any
particular database makes convenient. Any mechanism that can leave the catalog holding a
non-Dinner has failed the model, whatever its other merits.

**INV-8 is different in kind** and worth separating explicitly. Uniqueness is a statement about a
_set_ of Dinners, and no single aggregate can verify it about itself — a Dinner cannot know what
other Dinners are named without reaching outside its own boundary. Classic DDD calls this a
set-based constraint, and the standard answer is that it belongs to the store, not the aggregate.
A read-then-write check in the client is not an enforcement of INV-8; it is a courtesy that
narrows the window. Story 006 says the same thing in plainer words: _a check-then-insert race is
not a correctness argument._

---

### Domain Events

- **DinnerAdded** — Trigger: a complete Dinner aggregate is persisted. Payload: the dinner and its
  household. Consequences elsewhere: it becomes pickable in the catalog and cookable in the
  cooking view. Nothing in this unit subscribes; the effects are queries reading new rows.

- **GroceryFirstSeen** — Trigger: an IngredientLine names something the household's registry has
  not recorded. Payload: the ingredient name. **Owned entirely by an existing database trigger.**
  Listed so that its absence from this unit's code is deliberate and recorded, not an omission:
  ADR-7 makes the trigger the only creator, and application code that "helps" would be a defect.

---

### Domain Services

- **RecipeSaver** — Operations: `save(draft) → Dinner | SaveRejection`. Dependencies: the
  household of the caller; the Dinner store.

  Its contract is stated in terms of the aggregate: it persists a complete Dinner or it changes
  nothing. It reports a rejection the interface can render in English — in particular, a name
  clash is a _domain_ outcome, not a database error that leaked; the user asked for something the
  model forbids (INV-8) and is entitled to be told so in their own language, with their draft
  intact.

---

### Repository Interfaces

- **DinnerRepository** — Entity: Dinner (the aggregate).
  - `add(recipe, household) → Dinner` — takes the **whole aggregate in one call**. There is no
    `addIngredient` or `addStep`: an interface offering those would let a caller construct the
    non-Dinner the model says cannot exist, and the repository would be complicit.
  - `nameExists(name, household) → boolean` — a courtesy for early warning. Explicitly **not** the
    enforcement of INV-8.

- **TagRepository** — Entity: Tag.
  - `resolve(names, household) → Tag[]` — find-or-create over the shared vocabulary, by TagName
    equality, so an existing word is reused rather than near-duplicated.

  Resolution happens **as part of saving the Dinner**, not before it. A tag created for a dinner
  that then fails to save is a word added to a shared, permanent, household-wide vocabulary in
  exchange for nothing — the same reasoning that kept bolt 059's draft carrying names instead of
  ids, carried one step further.

---

### Ubiquitous Language

- **Dinner** — a complete recipe in the catalog: fields, at least one ingredient, at least one
  step. Never a partial one; there is no such thing.
- **Draft** — an unsaved recipe being edited. May be incomplete; that is what makes it a draft
  rather than a Dinner.
- **Line** — one ingredient with its quantity, unit and part of the store.
- **Step** — one instruction. Its number is its position, not a stored fact about it.
- **Vocabulary** — the household's shared set of tag words. Open, user-managed, and permanent:
  nothing in this unit deletes from it.
- **Registry** — the grocery items behind the walking path. Trigger-owned; this unit only causes
  entries to appear, never writes them.
- **Save** — persisting a complete Dinner. Not a synonym for "insert"; an insert is one
  implementation detail of a save, and there are several inserts in one save.

---

### Stories Covered

| Story                       | Covered by                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| 005-atomic-save             | The aggregate boundary, INV-1…INV-7, `DinnerRepository.add`, `TagRepository.resolve`                      |
| 006-duplicate-name-handling | INV-8 as a set-based constraint; `SaveRejection` as a domain outcome                                      |
| 007-manual-entry-tests      | Every invariant above is a testable claim; the aggregate/transaction identity is the one worth falsifying |

### What this stage deliberately does NOT decide

Whether the transaction is opened by a Postgres function or approximated by the client. That is a
technical design question, and the model's only demand on it is the one stated under Aggregates:
**no mechanism may leave the catalog holding a row that is not a Dinner.** Stage 2 designs against
that demand; stage 3 records why the chosen option meets it.
