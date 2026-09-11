---
stage: model
bolt: 069-servings-setting
created: '2026-09-11T16:41:19Z'
---

## Static Model: 001-serving-size-setting

Bolt 063 turned "how many dinners" from a literal into a household property. This bolt does the
same for "how many people". It is the same aggregate with a sibling value, and, as with 063, it
comes down to a narrow modelling question that needs a plain answer: **what does the number actually
mean for the dinners already stored?**

---

### Entities

- **Household**: `id`, `name`, `week_start_day`, `dinners_per_week`, **`servings_per_dinner` (NEW)**
  - This is the third household preference that the rest of the model reads instead of assuming.
    Its siblings answer _when_ the week starts (`week_start_day`, intent 011) and _how many dinners_
    (`dinners_per_week`, intent 015). This one answers _how many people a dinner is cooked for_.
  - It defaults to **3**, so every existing household keeps today's behaviour with no data migration.

- **Dinner**: `id`, `household_id`, `name`, `cuisine_type`, `cook_time_minutes`, `instructions`,
  plus its ingredient lines, steps and tag links. **Unchanged by this bolt.**
  - **A dinner carries no serving count.** That fact drives the whole question below.

---

### Value Objects

- **ServingSize**: an integer in **1..12**
  - The lower bound is one because cooking for one person is coherent. Twelve is a sanity bound on
    a family planner, not a product opinion. It exists to reject typos like 30 or 0, not to rule on
    who counts as family.
  - This is the proposal. Stage 2 confirms it against the Settings control.

- **SourceYield**: what a recipe page says it serves, such as "6", "8–10", or nothing at all.
  - **Not introduced by this bolt.** Bolt 070 carries it. It is named here, one bolt early, because
    it must never be confused with ServingSize, and the similar words make that easy to do (see
    Ubiquitous Language).

---

### Aggregates

- **Household** (aggregate root for household preferences)
  - **Invariant 1:** `servings_per_dinner` is always a valid ServingSize. Postgres enforces it
    (ADR-1), not just the form. A limit on the client can be bypassed; a constraint on the column
    cannot.
  - There is no cross-row invariant, no trigger, and no concurrency concern. That is the whole
    point of calling 069 "063 without the interesting part".

- **Dinner** (aggregate root, bolt 060's ADR-13 boundary): **untouched.** Nothing in this bolt
  writes to a dinner or its children.

---

### What does ServingSize mean for dinners already stored?

This is the question with real consequences, and it is not about the new column. It is about a rule
the system has relied on without ever writing it down.

**Until intent 018, every dinner's quantities were implicitly "for 3".** Nothing stored that. It held
because the form hint said so, the extraction prompt rescaled to 3, and the founding 50 dinners were
written that way. Only the wording on screen and in the prompt kept it true.

**After intent 018 it stops being true, and that is deliberate.** Checkpoint 1 decided that imports
keep the source's quantities unless the user asks to scale. A bark imported as written holds
quantities for a whole tray. A household that later changes its ServingSize from 3 to 5 changes the
guidance, but not one stored quantity (NFR-1).

So the catalog will hold dinners whose quantities are for different numbers of people, and **nothing
records which number each dinner assumes.**

There are two ways to read a stored quantity:

1. **"What we actually cook."** A dinner's quantities are what the household buys and uses. Nothing
   more. ServingSize is only a _target offered_ when scaling an import, and _guidance_ when typing
   one in. On this reading the mix is not a defect. The shopping list adds up what will really be
   cooked, which is exactly right for a tray of bark, a batch of sauce, or a dinner deliberately
   kept at 8.
2. **"Quantities for ServingSize people."** Every dinner's quantities are for the household's
   number. The number would then have to be stored on each dinner, or a changed setting would
   silently make the whole catalog wrong. That needs a `servings` value on each dinner, which means
   a new column, new writes in 070 and 071, and replanning intent 018.

**This model adopts reading 1.** It is the only reading consistent with Checkpoint 1: "keep as
written" means stored quantities are exactly what was written. It needs no per-dinner column. It
also makes the shopping list correct for batch dishes, which reading 2 would get wrong.

**Its cost is one consequence, stated here so nobody discovers it later.** The system can no longer
say how many people a stored dinner feeds. If a future intent wants to scale a _saved_ dinner (say,
"make this for 8 tonight"), it will first need to add a per-dinner yield. This bolt does not prevent
that. It just does not build it in advance.

---

### Consequence for the copy: the literal is not just "3"

FR-6 says no screen and no prompt still says 3. The model shows the number is tied to more than a
digit:

- **"two adults and one small child"** describes one particular 3. At ServingSize 5 the sentence
  "Quantities are for 5 servings — two adults and one small child" is false. The family description
  has to go, or be derived from the number. It cannot simply stay next to a variable.
- **"Quantities are for N servings"** makes a claim about the whole catalog that reading 1 makes
  untrue for imports kept as written. On the manual-entry form it should read as **guidance for what
  you are entering**, not as a rule about every dinner.
- **The extraction prompt's rescaling rule** uses the same 3. Bolt 070 removes that rule entirely.
  Stage 2 has to decide the sequencing: 069 can parameterise it first (which is correct if 069 ships
  alone), or leave it for 070 to delete.

---

### Domain Events

- **ServingSizeChanged**: Trigger: an owner saves a new value on `/settings`. Payload:
  `household_id`, old value, new value.
  - **Nothing reacts to it.** No stored quantity is recomputed (NFR-1), and no plan or shopping list
    is rebuilt. The event is worth naming precisely because it has no subscribers. A future change
    that makes something react to it would be changing what stored data means, and should be
    treated as that.

---

### Domain Services

- None. This bolt has no operation that spans entities. Scaling a draft is a pure calculation, and
  it belongs to bolt 070.

---

### Repository Interfaces

- **HouseholdPreferences**: Entity: Household. Methods: `readServingSize(householdId)`,
  `setServingSize(householdId, ServingSize)`.
  - The write path is left undecided here on purpose. ADR-6 records that `.upsert()` fails with
    42501 on a table with column-level grants. Stage 2 must check how `dinners_per_week` is written
    today and follow the same path, not assume one.
  - Readers: the Settings control, the manual-entry form's guidance, and, from bolt 071, the review
    form's scale control.

---

### Ubiquitous Language

- **Servings per dinner / ServingSize**: how many people the _household_ cooks for. It is a
  household preference, and the target offered when scaling.
- **Yield / SourceYield**: how many a _recipe page_ says it serves. It is a fact about a source,
  kept exactly as stated, possibly a range, possibly absent. It arrives with bolt 070.
- **Dinners per week**: how many dinners a plan holds (intent 015). It is a different number about a
  different thing, and the two must never share a control or a label.
- **Stored quantity**: what the household actually cooks with (reading 1), not "for ServingSize
  people".
- **Scale**: to multiply a _draft's_ quantities by target ÷ yield when the user asks, during review.
  It never happens to a stored dinner.

**The pair to keep apart is ServingSize and yield.** "Serves 8" on a page and "we cook for 3" at home
are both "servings" in everyday speech. If code calls both "servings", a later change will end up
scaling by the wrong one. Give them different names from the first line of code.

---

### Stories covered

- ✅ **001-servings-column**: the Household gains ServingSize, bounded and defaulted (Invariant 1)
- ✅ **002-servings-setting-control**: an owner-editable preference beside its two siblings, with the
  explanation it must carry
- ✅ **003-no-more-hardcoded-three**: widened by this model to cover the family description and the
  guidance wording, not just the digit
