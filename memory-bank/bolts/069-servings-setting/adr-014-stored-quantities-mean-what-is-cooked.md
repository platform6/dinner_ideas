---
bolt: 069-servings-setting
created: '2026-09-11T16:51:43Z'
status: accepted
superseded_by: null
---

# ADR-14: A Stored Dinner's Quantities Mean What the Household Cooks, Not Quantities for N People

## Context

Before intent 018, every dinner in the catalog was implicitly "for 3". Nothing stored that. It held
because three things agreed: the entry form told the user _"Quantities are for 3 servings — two
adults and one small child"_, the recipe-import prompt rescaled every import to 3, and the founding
50 dinners were written for 3. The rule was kept true only by that wording on the form and in the
prompt.

Intent 018 ends it on purpose, in two ways at once:

- **Imports keep the source's quantities unless the user asks to scale** (Checkpoint 1). A tray of
  bark is saved with a whole tray's butter. A dinner may be kept at the 8 servings its page stated.
- **The household's serving size becomes a setting** (`households.servings_per_dinner`, bolt 069).
  A household can move it from 3 to 5.

After that, the catalog holds dinners sized for different numbers of people, and **a `dinners` row
carries no serving count**. The question is what a stored quantity _means_. The answer decides what
any future feature is allowed to do with it.

It was raised during intent 018's inception as the household-versus-dish tension. The inception
resolved it for _imports_ (nothing is scaled unasked). Bolt 069's domain model found it applies just
as much to _stored data_, and the product owner confirmed at bolt 069's design checkpoint: **"we do
not want to rescale the recipes on setting change."**

## Decision

**A stored dinner's ingredient quantities mean what the household actually cooks with. They do not
mean "quantities for `servings_per_dinner` people".**

It follows that:

1. **Changing `servings_per_dinner` never changes a stored quantity.** No trigger, job, migration or
   client action rescales saved dinners when the setting changes. `ServingSizeChanged` has no
   subscribers, and that is intended.
2. **`servings_per_dinner` has exactly two jobs.** It is the _target offered_ when the user chooses
   to scale an imported draft during review, and the _guidance_ shown when typing quantities in.
   It is never a description of what is in the catalog.
3. **Scaling happens only to a draft**, on review, at the user's request (intent 018 FR-3/FR-4).
   There is no operation that scales a saved dinner.
4. **The shopping list adds up stored quantities as they are**, which is what will really be cooked:
   a whole tray of bark, a dinner kept at 8, a dinner typed in for 3.

## Rationale

It is the only meaning consistent with "keep as written". If imports are saved exactly as written,
the stored quantity _is_ what was written, and it has no second meaning in terms of a household
number.

It is also the meaning that makes the shopping list correct. A tray bake is bought for as a tray.
A reading where every quantity is "for N people" would, for a bark, try to buy butter for 3 or 5
people's worth of a thing nobody portions that way.

Finally, it avoids storing a fact the domain does not reliably have. The founding 50 were "for 3" by
convention, imports carry a yield only when the page printed one (sometimes as "8–10", which has no
single value), and typed-in dinners carry whatever the cook had in mind. A per-dinner serving count
filled from that would look precise and mostly be a guess.

### Alternatives Considered

| Alternative                                          | Pros                                                                     | Cons                                                                                                                                             | Why Rejected                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Per-dinner `servings` column, quantities "for N"** | The app could say how many a dinner feeds; saved dinners become scalable | New column plus writes in bolts 070/071; the founding 50 and typed dinners have no real value to store; wrong for tray bakes                     | Stores a value that would mostly be a guess, and gets batch dishes wrong. Needs a replan of 018 for a feature nobody has asked for |
| **Rescale the catalog when the setting changes**     | The catalog always "matches" the household number                        | Destroys what was actually cooked; runs on every change; unrecoverable after repeated changes (rounding compounds); makes a tray of bark smaller | Rejected by the product owner outright. It rewrites user data to match a preference, which NFR-1 exists to prevent                 |
| **Keep "for 3" as a documented convention**          | No change to anything                                                    | False the moment an import is kept as written; false the moment a household sets 5                                                               | It is already untrue under intent 018. Documenting it would record a rule the system no longer follows                             |

## Consequences

### Positive

- Changing a setting can never corrupt the catalog. There is simply no path from the preference to
  a stored row.
- The shopping list is right for batch and tray dishes without special cases.
- There is no per-dinner field to backfill for 50+ existing dinners and no guess stored as fact.
- The model does less, and so has less to get wrong: scaling is a pure calculation on a draft the
  user can see before and after.

### Negative

- **The app cannot say how many people a stored dinner feeds.** "Serves 3" is not something it can
  truthfully display.
- **A saved dinner cannot be scaled.** A future "make this for 8 tonight" feature, or scaling a whole
  week's plan up for guests, **must first introduce a per-dinner yield** and decide what to put in it
  for dinners that never had one. This ADR does not block that; it records that it is not free.
- The entry form's guidance has to be worded as guidance ("Enter quantities for N"), not as a
  statement about the catalog. It is a small loss of the old line's reassurance.

## Read When

- **Before building anything that reacts to `servings_per_dinner` changing.** The expected answer
  is "nothing does", and a subscriber to that change is a change to what stored data means.
- **Before scaling a saved dinner, a plan, or a shopping list by serving count.** A per-dinner yield
  is a prerequisite, and it needs a decision about the dinners that have none.
- **Before displaying "serves N" for a dinner**, or treating stored quantities as "for N people"
  anywhere, including in any prompt that reads saved dinners back.
- **When naming anything about servings.** `servings_per_dinner` (the household's target) and a
  source's _yield_ (what a page says it serves) are different things and must not share a name.

See also: ADR-13 (what a Dinner is, as an aggregate), intent 018 NFR-1, and bolt 069's domain model
("What does ServingSize mean for dinners already stored?").
