---
stage: model
bolt: 063-dinners-per-week-rule
created: '2026-09-08T18:10:00Z'
---

## Static Model: 001-dinners-per-week-model

Bolt 067 rescoped **which plans** the draft rule applies to. This bolt parameterises **how many
selections** a plan may hold. Same aggregate, adjacent invariants, and the second half of turning
a pair of hard-coded assumptions into household properties.

The modelling question is narrow and worth stating plainly: _whose_ number is three, and _when_ is
it read?

---

### Entities

- **Household** — `id`, `name`, `week_start_day`, **`dinners_per_week` (NEW)**
  - Already owns `week_start_day` (intent 011), which decides _when_ a planning week starts.
    `dinners_per_week` decides _how large_ a plan for that week may be. The two are siblings: both
    are household preferences that the rest of the model reads rather than assumes.
  - Default 3, so every existing household keeps today's behaviour with no data migration.

- **WeeklyPlan** — `id`, `household_id`, `start_date`, `locked_at`, `created_at`
  - Unchanged by this bolt. Its invariants gain a variable where they had a literal.

- **WeeklyPlanSelection** — `id`, `weekly_plan_id`, `dinner_id`
  - Unchanged. Its _cardinality bound_ is what moves.

---

### Value Objects

- **PlanSize** — a household's `dinners_per_week`, an integer in **1..7**
  - Seven because a week has seven days; one because a household that plans a single dinner is
    doing something coherent. The ceiling is a sanity bound, not a product opinion.
  - **Read from the plan's household, never from the caller's session.** A plan belongs to a
    household; the rule that governs it is that household's, whoever is writing.

- **PlanningWeek** — `(household_id, start_date)`, from bolt 067. Unchanged, and relevant here only
  because both invariants below are per-plan and a plan belongs to one planning week.

---

### Aggregates

- **WeeklyPlan** (aggregate root)
  - **Invariants** (all three stated in bolt 067; two change here):
    1. A locked plan is immutable.
    2. **A plan may hold at most `PlanSize` selections.** — was "at most 3"
    3. **A plan may be locked only with exactly `PlanSize` selections.** — was "exactly 3"
    4. At most one draft plan per household per planning week (bolt 067, unchanged).

  **Invariant 2 is the one with history.** It is enforced by a trigger that takes `for update` on
  the plan row before counting, because two concurrent inserts could otherwise each read a count
  below the cap and both commit — landing the plan at four. That was a real bug, fixed in
  `20260827002830`. Parameterising the bound must not disturb the serialisation that fixes it.

  **Invariant 3 is stated in a function's name.** `fn_weekly_plans_require_three_on_lock` asserts
  "three" in its identifier. After this bolt the name is false.

---

### When is PlanSize read?

The consequential modelling decision, and the one the design stage must settle.

Three candidate answers:

1. **At write time, from the plan's household.** The rule in force is whatever the household's
   setting says at the moment of the write. A household that raises its number can immediately add
   more; one that lowers it cannot add more, but keeps what it has.
2. **Frozen onto the plan when created.** A plan would carry the size it was created under. Stable
   for the life of a plan, but requires a new column and makes a setting change invisible until
   next week.
3. **At lock time only.** Cap unenforced during editing, checked once at the end. Rejected on
   sight: it abandons invariant 2, which exists precisely so the cap cannot be exceeded
   concurrently.

**Option 1.** It matches the product decision already recorded — "an unlocked week adopts the new
number; a locked week is untouched" — and needs no new column. Its one sharp edge is stated below.

---

### The asymmetry that follows from option 1

Lowering the setting below a plan's current selection count produces a plan that is **valid but
unlockable**:

- Invariant 2 is not violated. It bounds _adding_; existing rows are not retroactively illegal, and
  nothing is deleted. A plan at 5 selections with the setting lowered to 3 simply cannot grow.
- Invariant 3 _is_ unsatisfiable until the user removes selections, because locking requires
  **exactly** `PlanSize`.

This is not a defect. It is the honest consequence of the product decision that lowering the number
must not silently delete somebody's picks. But it produces a state where "lock" refuses for a
reason the user did not cause at lock time, so **the refusal must say what to do** — remove the
extra picks — rather than reporting a bare count mismatch.

Recorded here because a later reader will find this state and wonder whether it is a bug.

---

### Domain Events

- **SelectionAdded** — Trigger: a row is inserted into `weekly_plan_selections`.
  - Guarded by invariant 2, under serialisation. The guard's bound becomes `PlanSize`.

- **PlanLocked** — Trigger: `locked_at` null → non-null.
  - Guarded by invariant 3.
  - Consequence: one `MealHistory` row per selection.
  - **Already `PlanSize`-agnostic.** `fn_weekly_plans_record_meal_history` inserts one row per
    selection via a `select`, not three rows literally. Only its comment claims "Writes 3
    meal_history rows". The logic needs nothing; the comment lies and should be corrected.

---

### Domain Services

None introduced. The behaviour stays where it already lives:

- **The selection-cap trigger** — enforces invariant 2 under concurrency.
- **`lock_weekly_plan(plan_id)`** — performs the transition; triggers enforce 1 and 3.

Both gain a lookup and lose a literal. Neither changes shape.

---

### Repository Interfaces

Unchanged at the database boundary. The client gains one read:

- **`households.dinners_per_week`** — read by the settings control (writes it) and, in unit 002, by
  every screen that currently hard-codes 3.

Worth noting for unit 002: the client's copy of this number is an **affordance**, not the
enforcement. A screen that computes the wrong N shows the wrong prompt; it cannot corrupt a plan,
because invariants 2 and 3 hold in Postgres regardless of caller (ADR-1).

---

### Ubiquitous Language

- **Plan size** — how many dinners a household plans per week. A household property, not a
  constant. 1..7, default 3.
- **Full** — a plan holding exactly `PlanSize` selections. The point at which locking becomes
  possible and adding becomes impossible; the two thresholds coincide by design.
- **Unlockable** — a valid plan that cannot currently be locked because it holds more selections
  than the household's current plan size. Resolved by removing picks, never automatically.

---

### What this bolt is _not_ modelling

- **Any client screen.** Unit 002 owns every site that reads the number.
- **Per-plan size history.** Option 2 above — freezing the size onto the plan — is rejected, not
  deferred. If a household later wants "this week was planned as a 5", that is a new column and a
  new intent.
- **What the shopping list or cooking view do** once their gate passes.

Recorded so a later reader can see these were considered rather than missed.
