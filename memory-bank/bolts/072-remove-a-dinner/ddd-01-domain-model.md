---
stage: model
bolt: 072-remove-a-dinner
created: '2026-09-11T18:09:05Z'
---

## Static Model: 003-remove-a-dinner

Every other bolt in this project adds or adjusts. This one takes something away, and a dinner is
referenced from more places than its own aggregate. The modelling question is **what else a
dinner's removal takes with it, and what it must never take.**

Everything below comes from earlier bolts' design records. Source code is not read in this stage.
Anything that depends on trigger behaviour the records do not state is marked **[verify at Stage 4]**.

---

### Entities, and how each points at a Dinner

- **Dinner** (`dinners`): the aggregate root being removed.
- **Ingredient line, step, tag link** (`dinner_ingredients`, `dinner_steps`, `dinner_tags`):
  _inside_ the Dinner aggregate (ADR-13). All three are `REFERENCES dinners(id) ON DELETE CASCADE`
  according to bolts 001, 009 and 060's records. They go when the dinner goes, which is exactly
  right, because they are the dinner.
- **Tag** (`tags`): the household's **shared vocabulary**, outside the aggregate. `dinner_tags`
  references it `ON DELETE CASCADE` in the _other_ direction, so removing a tag would remove its
  links, but removing a dinner does nothing to a tag. **Tags survive by construction.**
- **Plan selection** (`weekly_plan_selections`): a dinner picked into a week's plan. Outside the
  aggregate. `dinner_id` is a plain `REFERENCES dinners(id)`, **with no delete rule**.
- **Meal history** (`meal_history`): the record that a dinner was part of a locked plan, written by
  a trigger at the lock transition (ADR-2). Outside the aggregate. `dinner_id` is a plain
  `REFERENCES dinners(id)`, **with no delete rule**.
- **Item** (`items`, ADR-7): the household's grocery registry, derived from ingredient names by a
  trigger on insert. It is a _registry_, shared across dinners and carrying the household's
  store-layout knowledge (`item_placements`). **It must survive a removal**, because another dinner
  may use the same item, and the placement is knowledge about the store, not about the dinner.
  **[verify at Stage 4: the sync trigger does nothing on ingredient delete]**

### What that means today

Because the two plain references have no delete rule, **Postgres currently refuses to delete any
dinner that has ever been picked into a plan or cooked.** The FK raises `23503`. The only dinners
removable today, by any means, are ones that have never been planned. The bark qualifies. Most of
the founding 50 do not.

So "remove a dinner" is not just a delete statement. It is a decision about those two references.

---

### Value Objects

- **RemovalImpact**: what a removal would take with it. The warning is built from this, and it is
  shown **before** anything happens:
  - `historyCount`: how many meal-history entries name this dinner (times it was cooked)
  - `pastPlanCount`: how many _previous_ weeks' plans included it
  - `inCurrentDraft`: whether it is picked in this week's **unlocked** plan
  - `inCurrentLockedPlan`: whether it is in this week's **locked** plan

---

### Aggregates and the invariants in play

- **Dinner** (root): removal is the reverse of ADR-13's write. **All of it, or none of it**
  (NFR-3). A dinner row without its ingredients was not a Dinner on the way in, and a half-removed
  one is not a Dinner on the way out.
- **WeeklyPlan** (root, from bolts 063/067), and its two invariants a removal can touch:
  1. **A locked plan is immutable.**
  2. **A locked plan holds exactly `dinners_per_week` selections.**

  Removing a selection from a **locked** plan would break both. Removing one from an **unlocked**
  plan breaks neither, because a draft is meant to change.

---

### The decision: what removal takes, and the one thing it will not break

Checkpoint 2 decided **warn and proceed, do not refuse**, because refusing would leave a wrong
recipe in the catalog _permanently_ the moment anyone had cooked it. The model honours that, with
one bounded exception that the decision's own reason does not reach:

| The dinner is…                          | Removal…                                                                                  | Because                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| never planned                           | deletes the dinner and its lines, steps and tag links                                     | the common case; the bark                                                                                             |
| in **past** weeks' plans / meal history | **also deletes those history entries and past selections**, after warning with the counts | see "Why history goes" below                                                                                          |
| in **this week's unlocked** plan        | **also takes it off the plan**, after warning that this week's shopping list will change  | a draft is meant to change                                                                                            |
| in **this week's locked** plan          | **is refused, for now**, with the reason and when it becomes possible                     | removing it would break a locked plan's two invariants mid-week, and the refusal lasts only until the week rolls over |

**The exception does not contradict Checkpoint 2's reasoning.** That decision was about
_permanence_: a cooked recipe stuck forever. A dinner in this week's locked plan is being cooked
_this week_. It can be removed as soon as the week rolls over, and is never stuck. Until then,
"Not interested" hides it from the catalog. **This exception is flagged for the product owner to
confirm or overturn**, because it is the one place the model narrows an explicit decision.

#### Why history goes, instead of being kept as a record

Keeping history for a removed dinner would need its references to point _somewhere_: a nullable
`dinner_id` plus a snapshot of the name, or a tombstone row that still holds the name. Either way
it adds a "removed dinner" state that every history reader would then have to handle.

It would be worth that cost only if something _used_ the history of a dinner that no longer exists.
Nothing does. History's readers are all **per dinner**: the "last made" label on a card,
`dinner_last_chosen`, and the lucky-pick recency weighting (intent 016). For a removed dinner each
of those has nothing left to label, weight or pick. Past weeks' plans are not browsable after
rollover (intent 011). **So the history of a removed dinner has no remaining reader, and deleting it
loses nothing anyone can see.** The warning still states the count, so the user knows exactly what
goes.

**[verify at Stage 4: nothing surfaces past weeks' plans or raw meal history]**

---

### Domain Events

- **DinnerRemoved**: Trigger: the user confirms removal. Payload: `dinner_id`, name, and the
  RemovalImpact that was shown. It is atomic: either the event happened in full or nothing did.

### Domain Services

- **DinnerRemoval**: `impactOf(dinnerId)` returns a RemovalImpact, and `remove(dinnerId)` either
  removes everything in one transaction or refuses with the locked-plan reason. `remove`
  re-checks the locked-plan condition itself. The client's warning is information, not the guard
  (ADR-1).

### Repository Interfaces

- **DinnerRemovalRepository**: `impact(dinnerId)`, `remove(dinnerId)`. Both are scoped by household
  RLS, and one household can never remove, or even measure, another's dinner.

---

### Ubiquitous Language

- **Remove**: permanent. The dinner, its lines, steps and tag links, and its past history are gone.
  The name becomes free.
- **Not interested**: the existing, **reversible** hide (`is_active = false`). Nothing is deleted.
  The two must never read as the same action. One can be undone from the Suppressed page, and the
  other cannot be undone at all.
- **Past plan / this week's plan**: a plan belongs to one planning week (bolt 067). "This week" is the
  current planning week.
- **History**: `meal_history`, written when a plan is locked. It means "was planned and locked", which
  the product reads as "was cooked".

---

### Stories covered

- ✅ **001-remove-a-dinner**: atomic removal of the aggregate; tags and items survive; the name
  becomes reusable; RLS-scoped
- ✅ **002-confirm-before-removing**: RemovalImpact drives a warning stated before anything happens;
  "Not interested" stays the reversible option
- ✅ **003-removal-tests**: the invariants to prove are named: atomicity, no orphans, tags and
  items survive, the locked-plan refusal, and cross-household isolation
